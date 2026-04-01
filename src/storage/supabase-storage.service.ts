import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * `getPublicUrl()` gera URLs em `/object/public/{bucket}/...`.
 * Essas URLs só respondem 200 se o bucket estiver **público** no dashboard.
 * Buckets novos são privados por padrão — sem isso o navegador pode retornar
 * 404 / "Bucket not found". Ative em: Storage → bucket → Configuration → Public bucket.
 * @see https://supabase.com/docs/guides/storage/buckets/fundamentals#public-buckets
 */
@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow<string>('SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    this.bucket = this.config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');
  }

  async uploadRecipeImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não suportado (${file.mimetype}). Aceitos: jpeg, png, webp`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      );
    }

    const ext = MIME_TO_EXT[file.mimetype];
    const path = `recipes/${userId}/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Falha no upload para Supabase Storage: ${error.message}`, error);
      throw new InternalServerErrorException('Falha ao enviar imagem');
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Caminho relativo ao bucket (ex.: `recipes/uuid/arquivo.jpg`) a partir da URL pública gravada no banco.
   */
  extractObjectPathFromStoredPublicUrl(storedUrl: string): string | null {
    const marker = `/object/public/${this.bucket}/`;
    const i = storedUrl.indexOf(marker);
    if (i === -1) {
      return null;
    }
    return decodeURIComponent(storedUrl.slice(i + marker.length));
  }

  /**
   * Remove o objeto do bucket quando a URL foi gerada por este projeto e o caminho
   * pertence ao usuário (`recipes/{userId}/...`). Ignora URLs externas ou inválidas.
   */
  async tryDeleteStoredRecipeImage(
    imageUrl: string | null | undefined,
    ownerUserId: string,
  ): Promise<void> {
    if (!imageUrl?.trim()) {
      return;
    }

    const path = this.extractObjectPathFromStoredPublicUrl(imageUrl);
    if (!path) {
      return;
    }

    const expectedPrefix = `recipes/${ownerUserId}/`;
    if (!path.startsWith(expectedPrefix)) {
      this.logger.warn(
        `Caminho de storage não corresponde ao dono da receita; não removendo: ${path}`,
      );
      return;
    }

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      this.logger.warn(
        `Não foi possível remover "${path}" do storage: ${error.message}`,
      );
    }
  }

  /**
   * Para buckets **privados**: gera URL temporária de leitura (não persistir no banco).
   * @see https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
   */
  async createSignedReadUrl(
    objectPath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      this.logger.warn(
        `createSignedUrl falhou para "${objectPath}": ${error?.message ?? 'sem URL'}`,
      );
      throw new InternalServerErrorException('Não foi possível gerar URL da imagem');
    }

    return data.signedUrl;
  }
}

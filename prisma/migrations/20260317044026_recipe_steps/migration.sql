-- CreateTable
CREATE TABLE "RecipeSteps" (
    "id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipe_id" TEXT NOT NULL,

    CONSTRAINT "RecipeSteps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecipeSteps" ADD CONSTRAINT "RecipeSteps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

export interface Nutrients {
  calories: string;
  protein: string;
  fat: string;
  carbohydrates: string;
  saturatedFat: string;
  transFat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

export interface NutritionResponse {
  isValidFood: boolean;
  foodName: string | null;
  servingSize: string | null;
  nutrients: Nutrients | null;
  description: string;
}

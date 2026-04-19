import { Transform, Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max
} from "class-validator";

export class UpsertAiGraphDto {
  @IsOptional()
  @IsUUID("4", { message: "Id must be a valid UUID." })
  Id?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "Ai_Id must be a string." })
  @MaxLength(255, { message: "Ai_Id cannot exceed 255 characters." })
  Ai_Id?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "Item must be a string." })
  @MaxLength(255, { message: "Item cannot exceed 255 characters." })
  Item?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "CurrentStock must be a whole number." })
  @Min(0, { message: "CurrentStock cannot be less than 0." })
  CurrentStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "AiRecommendedQty must be a whole number." })
  @Min(0, { message: "AiRecommendedQty cannot be less than 0." })
  AiRecommendedQty?: number;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "AiReasoning must be a string." })
  AiReasoning?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "StockoutRisk must be a string." })
  @MaxLength(100, { message: "StockoutRisk cannot exceed 100 characters." })
  StockoutRisk?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "ConfidenceScore must be a valid number with at most 2 decimal places." }
  )
  @Min(0, { message: "ConfidenceScore cannot be less than 0." })
  @Max(100, { message: "ConfidenceScore cannot exceed 100." })
  ConfidenceScore?: number;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "ConfidenceLabel must be a string." })
  @MaxLength(100, { message: "ConfidenceLabel cannot exceed 100 characters." })
  ConfidenceLabel?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "Sku must be a string." })
  @MaxLength(255, { message: "Sku cannot exceed 255 characters." })
  Sku?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "Category must be a string." })
  @MaxLength(255, { message: "Category cannot exceed 255 characters." })
  Category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "MaxCapacity must be a whole number." })
  @Min(0, { message: "MaxCapacity cannot be less than 0." })
  MaxCapacity?: number;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "RecommendationNote must be a string." })
  @MaxLength(255, { message: "RecommendationNote cannot exceed 255 characters." })
  RecommendationNote?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString({ message: "ImageUrl must be a string." })
  ImageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "ForecastWindowDays must be a whole number." })
  @Min(1, { message: "ForecastWindowDays must be at least 1." })
  @Max(365, { message: "ForecastWindowDays cannot exceed 365." })
  ForecastWindowDays?: number;
}

export class SyncAiGraphDto {
  @IsArray({ message: "rows must be an array." })
  @ValidateNested({ each: true })
  @Type(() => UpsertAiGraphDto)
  rows!: UpsertAiGraphDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "ForecastWindowDays must be a whole number." })
  @Min(1, { message: "ForecastWindowDays must be at least 1." })
  @Max(365, { message: "ForecastWindowDays cannot exceed 365." })
  ForecastWindowDays?: number;
}
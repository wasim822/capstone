export class AiGraphModel {
    Id!: string;
    Ai_Id?: string;
    Item?: string;
    Sku?: string;
    Category?: string;
    CurrentStock?: number;
    MaxCapacity?: number;
    AiRecommendedQty?: number;
    RecommendationNote?: string;
    ForecastWindowDays?: number;
    AiReasoning?: string;
    StockoutRisk?: string;
    ConfidenceScore?: number;
    ConfidenceLabel?: string;
    ImageUrl?: string;
}
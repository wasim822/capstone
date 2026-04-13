export class AiGraphModel {
    Id!: string;
    Ai_Id?: string;
    Item?: string;
    CurrentStock?: number;
    AiRecommendedQty?: number;
    AiReasoning?: string;
    StockoutRisk?: string;
    ConfidenceScore?: number;
    ConfidenceLabel?: string;
}
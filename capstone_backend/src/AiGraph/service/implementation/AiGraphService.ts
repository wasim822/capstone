import { inject, injectable } from "tsyringe";
import { IAiGraphService } from "../interface/IAiGraphService";
import { AiGraphRepository } from "../../repository/AiGraphRepository";
import { AiGraphModel } from "../../model/AiGraphModel";
import { UpsertAiGraphDto } from "../../dto/AiGraghDto";
import { AiGraphEntity } from "../../entity/AiGraphEnitity";

@injectable()
export class AiGraphService extends IAiGraphService {
  constructor(
    @inject(AiGraphRepository) private readonly aiGraphRepository: AiGraphRepository,
  ) {
    super();
  }

  async GetAiGraphs(query?: Record<string, string>): Promise<[AiGraphModel[], number]> {
    const entities = await this.aiGraphRepository.GetAiGraphs(query) as AiGraphEntity[];
    const total = await this.aiGraphRepository.GetAiGraphs(query, true) as number;
    return [entities.map(entity => this.MapEntityToModel(entity)), total];
  }

  async GetAiGraphById(id: string): Promise<AiGraphModel | null> {
    const entity = await this.aiGraphRepository.GetAiGraphById(id);
    if (!entity) return null;
    return this.MapEntityToModel(entity);
  }

  async GetActiveAiGraphsByForecastWindow(forecastWindowDays?: number): Promise<AiGraphModel[]> {
    const entities = await this.aiGraphRepository.GetActiveAiGraphsByForecastWindow(forecastWindowDays);
    return entities.map((entity) => this.MapEntityToModel(entity));
  }

  async CreateAiGraph(dto: UpsertAiGraphDto): Promise<string> {
    const newId = await this.aiGraphRepository.AddAiGraph(dto);
    if (!newId) {
      throw new Error("Failed to create AI graph");
    }
    return newId;
  }

  async ReplaceAiGraphs(rows: UpsertAiGraphDto[], forecastWindowDays?: number): Promise<number> {
    return await this.aiGraphRepository.ReplaceAiGraphs(rows, forecastWindowDays);
  }

  async UpdateAiGraph(dto: UpsertAiGraphDto): Promise<string> {
    if (!dto.Id) {
      throw new Error("Id is required for update");
    }
    const updatedId = await this.aiGraphRepository.UpdateAiGraph(dto);
    return updatedId;
  }

  async DeleteAiGraph(id: string): Promise<string> {
    const deletedId = await this.aiGraphRepository.DeleteAiGraph(id);
    return deletedId;
  }

  async DeleteAllAiGraphs(): Promise<void> {
    await this.aiGraphRepository.DeleteAllAiGraphs();
  }

  private MapEntityToModel(entity: AiGraphEntity): AiGraphModel {
    const model: AiGraphModel = {
      Id: entity.Id,
      Ai_Id: entity.Ai_Id,
      Item: entity.item,
      CurrentStock: entity.currentStock,
      AiRecommendedQty: entity.aiRecommendedQty,
      AiReasoning: entity.aiReasoning,
      StockoutRisk: entity.stockoutRisk,
      ConfidenceScore: entity.confidenceScore,
      ConfidenceLabel: entity.confidenceLabel,
    };

    if (entity.forecastWindowDays !== undefined) model.ForecastWindowDays = entity.forecastWindowDays;
    if (entity.sku !== undefined) model.Sku = entity.sku;
    if (entity.category !== undefined) model.Category = entity.category;
    if (entity.maxCapacity !== undefined) model.MaxCapacity = entity.maxCapacity;
    if (entity.recommendationNote !== undefined) model.RecommendationNote = entity.recommendationNote;
    if (entity.imageUrl !== undefined) model.ImageUrl = entity.imageUrl;

    return model;
  }
}
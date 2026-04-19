import { injectable } from "tsyringe";
import { Repository } from "typeorm";
import { AppDataSource } from "../../data-source";
import { AiGraphEntity } from "../entity/AiGraphEnitity";
import { UpsertAiGraphDto } from "../dto/AiGraghDto";
import { RepositoryHelper } from "../../common/helper/RepositoryHelper";

@injectable()
export class AiGraphRepository {
  private repository: Repository<AiGraphEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(AiGraphEntity);
  }

  async GetAiGraphs(queryParams?: Record<string, string>, getTotal: boolean = false): Promise<AiGraphEntity[] | number> {
    const filterResult = RepositoryHelper.generateFilter(queryParams ?? {}, new Map());

    const query = this.repository.createQueryBuilder("ag").where("ag.DeletedAt IS NULL");

    if (filterResult.Filter.length > 0) {
      for (const filter of filterResult.Filter) {
        query.andWhere(filter.FilterString, filter.FilterValues);
      }
    }

    if (!getTotal && filterResult.OrderBy && filterResult.OrderBy.OrderByString) {
      query.orderBy(filterResult.OrderBy.OrderByString ?? "", filterResult.OrderBy.OrderByDirection ?? "ASC");
    }

    if (!getTotal && filterResult.Pagination && filterResult.Pagination.Page && filterResult.Pagination.PageSize) {
      query.skip((filterResult.Pagination.Page - 1) * filterResult.Pagination.PageSize);
      query.take(filterResult.Pagination.PageSize);
    }

    return getTotal ? await query.getCount() : await query.getMany();
  }

  async GetAiGraphById(id: string): Promise<AiGraphEntity | null> {
    return await this.repository.findOne({
      where: { Id: id, DeletedAt: null as any },
    });
  }

  async GetActiveAiGraphsByForecastWindow(forecastWindowDays?: number): Promise<AiGraphEntity[]> {
    const query = this.repository.createQueryBuilder("ag").where("ag.DeletedAt IS NULL");

    if (typeof forecastWindowDays === "number" && Number.isFinite(forecastWindowDays)) {
      query.andWhere("ag.forecastWindowDays = :forecastWindowDays", { forecastWindowDays });
    }

    query.orderBy("ag.CreatedAt", "DESC");
    return await query.getMany();
  }

  async AddAiGraph(dto: UpsertAiGraphDto): Promise<string> {
    const entityData = this.MapDtoToEntityData(dto);
    const entity = this.repository.create(entityData);
    const saved = await this.repository.save(entity);
    return (saved as any).Id;
  }

  async ReplaceAiGraphs(rows: UpsertAiGraphDto[], forecastWindowDays?: number): Promise<number> {
    const now = new Date();
    return await this.repository.manager.transaction(async (manager) => {
      const deleteQuery = manager
        .createQueryBuilder()
        .update(AiGraphEntity)
        .set({ DeletedAt: now })
        .where("DeletedAt IS NULL");

      if (typeof forecastWindowDays === "number" && Number.isFinite(forecastWindowDays)) {
        deleteQuery.andWhere("forecastWindowDays = :forecastWindowDays", { forecastWindowDays });
      }

      await deleteQuery.execute();

      if (!rows.length) {
        return 0;
      }

      const records = rows.map((row) =>
        manager.create(AiGraphEntity, this.MapDtoToEntityData(row, forecastWindowDays))
      );
      const saved = await manager.save(AiGraphEntity, records);
      return saved.length;
    });
  }

  async UpdateAiGraph(dto: UpsertAiGraphDto): Promise<string> {
    if (!dto.Id) throw new Error("Id is required for update");
    const updateData = this.MapDtoToEntityData(dto);
    await this.repository.update(dto.Id, updateData);
    return dto.Id;
  }

  async DeleteAiGraph(id: string): Promise<string> {
    await this.repository.update(id, { DeletedAt: new Date() });
    return id;
  }

  async DeleteAllAiGraphs(): Promise<void> {
    await this.repository.update({}, { DeletedAt: new Date() });
  }

  private MapDtoToEntityData(dto: UpsertAiGraphDto, forecastWindowDays?: number): Partial<AiGraphEntity> {
    const entityData: Partial<AiGraphEntity> = {};
    if (dto.Ai_Id !== undefined) entityData.Ai_Id = dto.Ai_Id;
    if (dto.Item !== undefined) entityData.item = dto.Item;
    if (dto.Sku !== undefined) entityData.sku = dto.Sku;
    if (dto.Category !== undefined) entityData.category = dto.Category;
    if (dto.CurrentStock !== undefined) entityData.currentStock = dto.CurrentStock;
    if (dto.MaxCapacity !== undefined) entityData.maxCapacity = dto.MaxCapacity;
    if (dto.AiRecommendedQty !== undefined) entityData.aiRecommendedQty = dto.AiRecommendedQty;
    if (dto.RecommendationNote !== undefined) entityData.recommendationNote = dto.RecommendationNote;
    if (dto.ForecastWindowDays !== undefined) {
      entityData.forecastWindowDays = dto.ForecastWindowDays;
    } else if (typeof forecastWindowDays === "number" && Number.isFinite(forecastWindowDays)) {
      entityData.forecastWindowDays = forecastWindowDays;
    }
    if (dto.AiReasoning !== undefined) entityData.aiReasoning = dto.AiReasoning;
    if (dto.StockoutRisk !== undefined) entityData.stockoutRisk = dto.StockoutRisk;
    if (dto.ConfidenceScore !== undefined) entityData.confidenceScore = dto.ConfidenceScore;
    if (dto.ConfidenceLabel !== undefined) entityData.confidenceLabel = dto.ConfidenceLabel;
    if (dto.ImageUrl !== undefined) entityData.imageUrl = dto.ImageUrl;
    return entityData;
  }
}

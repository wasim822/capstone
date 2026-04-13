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
    const filterResult = RepositoryHelper.generateFilter(queryParams ?? {}, new Map()); // Assuming no specific columns map for simplicity

    const query = this.repository.createQueryBuilder("ag")
      .where("ag.DeletedAt IS NULL");

    // Apply filters if any
    if (filterResult.Filter.length > 0) {
      for (const filter of filterResult.Filter) {
        query.andWhere(filter.FilterString, filter.FilterValues);
      }
    }
    // Apply order by
    if (!getTotal && filterResult.OrderBy && filterResult.OrderBy.OrderByString) {
      query.orderBy(filterResult.OrderBy.OrderByString ?? "", filterResult.OrderBy.OrderByDirection ?? "ASC");
    }
    // Apply pagination
    if (!getTotal && filterResult.Pagination && filterResult.Pagination.Page && filterResult.Pagination.PageSize) {
      query.skip((filterResult.Pagination.Page - 1) * filterResult.Pagination.PageSize);
      query.take(filterResult.Pagination.PageSize);
    }

    if (getTotal) {
      return await query.getCount();
    } else {
      return await query.getMany();
    }
  }

  async GetAiGraphById(id: string): Promise<AiGraphEntity | null> {
    return await this.repository.findOne({
      where: { Id: id, DeletedAt: null as any }
    });
  }

  async AddAiGraph(dto: UpsertAiGraphDto): Promise<string> {
    const entityData: any = {};
    if (dto.Ai_Id !== undefined) entityData.Ai_Id = dto.Ai_Id;
    if (dto.Item !== undefined) entityData.item = dto.Item;
    if (dto.CurrentStock !== undefined) entityData.currentStock = dto.CurrentStock;
    if (dto.AiRecommendedQty !== undefined) entityData.aiRecommendedQty = dto.AiRecommendedQty;
    if (dto.AiReasoning !== undefined) entityData.aiReasoning = dto.AiReasoning;
    if (dto.StockoutRisk !== undefined) entityData.stockoutRisk = dto.StockoutRisk;
    if (dto.ConfidenceScore !== undefined) entityData.confidenceScore = dto.ConfidenceScore;
    if (dto.ConfidenceLabel !== undefined) entityData.confidenceLabel = dto.ConfidenceLabel;

    const entity = this.repository.create(entityData);
    const saved = await this.repository.save(entity);
    return (saved as any).Id;
  }

  async UpdateAiGraph(dto: UpsertAiGraphDto): Promise<string> {
    if (!dto.Id) throw new Error("Id is required for update");
    const updateData: any = {};
    if (dto.Ai_Id !== undefined) updateData.Ai_Id = dto.Ai_Id;
    if (dto.Item !== undefined) updateData.item = dto.Item;
    if (dto.CurrentStock !== undefined) updateData.currentStock = dto.CurrentStock;
    if (dto.AiRecommendedQty !== undefined) updateData.aiRecommendedQty = dto.AiRecommendedQty;
    if (dto.AiReasoning !== undefined) updateData.aiReasoning = dto.AiReasoning;
    if (dto.StockoutRisk !== undefined) updateData.stockoutRisk = dto.StockoutRisk;
    if (dto.ConfidenceScore !== undefined) updateData.confidenceScore = dto.ConfidenceScore;
    if (dto.ConfidenceLabel !== undefined) updateData.confidenceLabel = dto.ConfidenceLabel;

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
}
import { AiGraphModel } from "../../model/AiGraphModel";
import { UpsertAiGraphDto } from "../../dto/AiGraghDto";

export abstract class IAiGraphService {
  abstract GetAiGraphs(query?: Record<string, string>): Promise<[AiGraphModel[], number]>;
  abstract GetAiGraphById(id: string): Promise<AiGraphModel | null>;
  abstract CreateAiGraph(dto: UpsertAiGraphDto): Promise<string>;
  abstract UpdateAiGraph(dto: UpsertAiGraphDto): Promise<string>;
  abstract DeleteAiGraph(id: string): Promise<string>;
  abstract DeleteAllAiGraphs(): Promise<void>;
}
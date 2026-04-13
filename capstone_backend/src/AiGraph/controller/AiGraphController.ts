import { JsonController, Get, Param, QueryParams, Post, Body, Delete, Put } from "routing-controllers";
import { AiGraphModel } from "../model/AiGraphModel";
import { IAiGraphService } from "../service/interface/IAiGraphService";
import { inject, injectable } from "tsyringe";
import { DataRespondModel } from "../../common/model/DataRespondModel";
import { UpsertAiGraphDto } from "../dto/AiGraghDto";
import { PaginatedDataRespondModel } from "../../common/model/PaginatedDataRespondModel";
import { PermissionActionEnum } from "../../Permission/enum/PermissionActionEnum";
import { AndPermission } from "../../common/decorator/PermissionDecorator";
import { PermissionModuleEnum } from "../../Permission/enum/PermissionModuleEnum";

@JsonController("/api/ai-graph")
@injectable()
export class AiGraphController {
    constructor(
        @inject(IAiGraphService.name) private readonly aiGraphService: IAiGraphService
    ) {}

    @Get("/list")
    @AndPermission(PermissionModuleEnum.INVENTORY, PermissionActionEnum.VIEW) // Assuming permission, adjust if needed
     async getAiGraphs(@QueryParams() query: Record<string, string>) {
        const [data, total] = await this.aiGraphService.GetAiGraphs(query);
        return new PaginatedDataRespondModel<AiGraphModel[]>(data, total, query["Page"], query["PageSize"]);
    }

    @Get("/:id")
    @AndPermission(PermissionModuleEnum.INVENTORY, PermissionActionEnum.VIEW)
    async getAiGraphById(@Param("id") id: string) {
        const data = await this.aiGraphService.GetAiGraphById(id);
        return new DataRespondModel<AiGraphModel>(data);
    }

    @Post("")
    @AndPermission(PermissionModuleEnum.INVENTORY, PermissionActionEnum.CREATE)
    async createAiGraph(@Body() dto: UpsertAiGraphDto) {
        const data = await this.aiGraphService.CreateAiGraph(dto);
        return new DataRespondModel<string>(data);
    }

    @Put("/:id")
    @AndPermission(PermissionModuleEnum.INVENTORY, PermissionActionEnum.UPDATE)
    async updateAiGraph(@Param("id") id: string, @Body() dto: UpsertAiGraphDto) {
        dto.Id = id;
        const data = await this.aiGraphService.UpdateAiGraph(dto);
        return new DataRespondModel<string>(data);
    }

    @Delete("/:id")
    @AndPermission(PermissionModuleEnum.INVENTORY, PermissionActionEnum.DELETE)
    async deleteAiGraph(@Param("id") id: string) {
        const data = await this.aiGraphService.DeleteAiGraph(id);
        return new DataRespondModel<string>(data);
    }

    @Delete("")
    @AndPermission(PermissionModuleEnum.INVENTORY, PermissionActionEnum.DELETE)
    async deleteAllAiGraphs() {
        await this.aiGraphService.DeleteAllAiGraphs();
        return new DataRespondModel<string>("All AI graphs deleted successfully");
    }
}
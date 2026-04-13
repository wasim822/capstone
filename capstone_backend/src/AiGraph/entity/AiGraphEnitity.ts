import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { Tracking } from "../../common/entity/Tracking";

@Entity("AI_graph")
export class AiGraphEntity extends Tracking {
    @PrimaryGeneratedColumn("uuid")
    Id!: string;

    @Column({ type: "varchar", length: 255 })
    Ai_Id!: string;

    @Column({ type: "varchar", length: 255 })
    item!: string;

    @Column({ type: "int" })
    currentStock!: number;

    @Column({ type: "int" })
    aiRecommendedQty!: number;

    @Column({ type: "text", nullable: true })
    aiReasoning!: string;

    @Column({ type: "varchar", length: 100 })
    stockoutRisk!: string;

    @Column({ type: "float" })
    confidenceScore!: number;

    @Column({ type: "varchar", length: 100 })
    confidenceLabel!: string;
}


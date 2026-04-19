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

    @Column({ type: "varchar", length: 255, nullable: true })
    sku?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    category?: string;

    @Column({ type: "int" })
    currentStock!: number;

    @Column({ type: "int", nullable: true })
    maxCapacity?: number;

    @Column({ type: "int" })
    aiRecommendedQty!: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    recommendationNote?: string;

    @Column({ type: "int", nullable: true })
    forecastWindowDays?: number;

    @Column({ type: "text", nullable: true })
    aiReasoning!: string;

    @Column({ type: "varchar", length: 100 })
    stockoutRisk!: string;

    @Column({ type: "float" })
    confidenceScore!: number;

    @Column({ type: "varchar", length: 100 })
    confidenceLabel!: string;

    @Column({ type: "text", nullable: true })
    imageUrl?: string;
}


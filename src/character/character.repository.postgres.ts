import { Pool } from "pg";
import { Character } from "./character.entity";
import { CharacterRepository } from "./character.repository.interface";

export class CharacterRepositoryPostgres implements CharacterRepository {

    private client: Pool;

    constructor(client: Pool) {
        this.client = client;
    }

    async createCharacter(character: Omit<Character, 'id' | 'create_time'>): Promise<Character> {
        const query = `INSERT INTO "character" (name, nickname, class_name, race, level, experience_points, health_points, mana_points, strength, agility, intelligence, defense, is_alive, avatar_url, backstory) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`;
        const values = [
            character.name,
            character.nickname,
            character.class_name,
            character.race,
            character.level,
            character.experience_points,
            character.health_points,
            character.mana_points,
            character.strength,
            character.agility,
            character.intelligence,
            character.defense,
            character.is_alive,
            character.avatar_url,
            character.backstory
        ];
        const result = await this.client.query(query, values);
        return result.rows[0] as Character;
    }

    async getCharacterById(id: number): Promise<Character | null> {
        const result = await this.client.query('SELECT * FROM "character" WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            return result.rows[0] as Character;
        }
        return null;
    }

    async getCharacters(): Promise<Character[]> {
        const result = await this.client.query('SELECT * FROM "character"');
        return result.rows as Character[];
    }

    async updateCharacter(id: number, character: Partial<Omit<Character, 'id' | 'create_time'>>): Promise<Character | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        Object.entries(character).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return this.getCharacterById(id);
        }

        values.push(id);
        const query = `UPDATE "character" SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await this.client.query(query, values);

        if (result.rows.length > 0) {
            return result.rows[0] as Character;
        }
        return null;
    }

    async deleteCharacter(id: number): Promise<boolean> {
        const result = await this.client.query('DELETE FROM "character" WHERE id = $1', [id]);
        return result.rowCount !== null && result.rowCount > 0;
    }
}
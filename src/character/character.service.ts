import { Character } from './character.entity';
import { CharacterRepository } from './character.repository.interface';

export class CharacterService {

    constructor(private readonly characterRepository: CharacterRepository) {}

    async getAllCharacters(): Promise<Character[]> {
        return await this.characterRepository.getCharacters();
    }

    async getCharacterById(id: number): Promise<Character | null> {
        if (id <= 0) {
            throw new Error('Character ID must be a positive number');
        }

        const character = await this.characterRepository.getCharacterById(id);

        if (!character) {
            return null;
        }

        return character;
    }

    async createCharacter(characterData: Omit<Character, 'id' | 'create_time'>): Promise<Character> {
        this.validateCharacterData(characterData);

        const character = await this.characterRepository.createCharacter(characterData);

        return character;
    }

    async updateCharacter(id: number, characterData: Partial<Omit<Character, 'id' | 'create_time'>>): Promise<Character | null> {
        if (id <= 0) {
            throw new Error('Character ID must be a positive number');
        }

        if (Object.keys(characterData).length === 0) {
            throw new Error('No data provided for update');
        }

        if (characterData.level !== undefined) {
            this.validateLevel(characterData.level);
        }

        if (characterData.experience_points !== undefined) {
            this.validateExperiencePoints(characterData.experience_points);
        }

        if (characterData.health_points !== undefined) {
            this.validateHealthPoints(characterData.health_points);
        }

        const character = await this.characterRepository.updateCharacter(id, characterData);

        return character;
    }

    async deleteCharacter(id: number): Promise<boolean> {
        if (id <= 0) {
            throw new Error('Character ID must be a positive number');
        }

        const deleted = await this.characterRepository.deleteCharacter(id);

        return deleted;
    }

    private validateCharacterData(data: Omit<Character, 'id' | 'create_time'>): void {
        if (!data.name || data.name.trim().length === 0) {
            throw new Error('Character name is required');
        }

        if (data.name.length > 100) {
            throw new Error('Character name must not exceed 100 characters');
        }

        this.validateLevel(data.level);
        this.validateExperiencePoints(data.experience_points);
        this.validateHealthPoints(data.health_points);
        this.validateManaPoints(data.mana_points);
        this.validateStats(data.strength, 'strength');
        this.validateStats(data.agility, 'agility');
        this.validateStats(data.intelligence, 'intelligence');
        this.validateStats(data.defense, 'defense');
    }

    private validateLevel(level: number): void {
        if (level < 1 || level > 100) {
            throw new Error('Character level must be between 1 and 100');
        }
    }

    private validateExperiencePoints(xp: number): void {
        if (xp < 0) {
            throw new Error('Experience points cannot be negative');
        }
    }

    private validateHealthPoints(hp: number): void {
        if (hp < 1) {
            throw new Error('Health points must be at least 1');
        }
    }

    private validateManaPoints(mp: number): void {
        if (mp < 0) {
            throw new Error('Mana points cannot be negative');
        }
    }

    private validateStats(value: number, statName: string): void {
        if (value < 1 || value > 100) {
            throw new Error(`${statName} must be between 1 and 100`);
        }
    }
}

import { Character } from "./character.entity";

export interface CharacterRepository {
    createCharacter(character: Omit<Character, 'id' | 'create_time'>): Promise<Character>;
    getCharacterById(id: number): Promise<Character | null>;
    getCharacters(): Promise<Character[]>;
    updateCharacter(id: number, character: Partial<Omit<Character, 'id' | 'create_time'>>): Promise<Character | null>;
    deleteCharacter(id: number): Promise<boolean>;
}
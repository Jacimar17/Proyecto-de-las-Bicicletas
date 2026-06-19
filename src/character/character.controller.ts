import { Request, Response } from "express";
import { CharacterService } from "./character.service";

export class CharacterController {

    private readonly characterService: CharacterService;

    constructor(characterService: CharacterService) {
        this.characterService = characterService;
    }

    public async getCharacters(_req: Request, res: Response): Promise<void> {
        try {
            const characters = await this.characterService.getAllCharacters();
            res.json(characters);
        } catch (error) {
            console.error('Error fetching characters:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    public async getCharacter(req: Request, res: Response): Promise<void> {
        const id = req.params.id;

        if (Number.isNaN(Number(id))) {
            res.status(400).json({ error: 'Invalid character ID' });
            return;
        }

        try {
            const character = await this.characterService.getCharacterById(Number(id));

            if (character) {
                res.json(character);
            } else {
                res.status(404).json({ error: 'Character not found' });
            }
        } catch (error: any) {
            console.error('Error fetching character:', error);
            res.status(400).json({ error: error.message });
        }
    }

    public async createCharacter(req: Request, res: Response): Promise<void> {
        try {
            const character = await this.characterService.createCharacter(req.body);
            res.status(201).json(character);
        } catch (error: any) {
            console.error('Error creating character:', error);
            res.status(400).json({ error: error.message });
        }
    }

    public async updateCharacter(req: Request, res: Response): Promise<void> {
        const id = req.params.id;

        if (Number.isNaN(Number(id))) {
            res.status(400).json({ error: 'Invalid character ID' });
            return;
        }

        try {
            const character = await this.characterService.updateCharacter(Number(id), req.body);

            if (character) {
                res.json(character);
            } else {
                res.status(404).json({ error: 'Character not found' });
            }
        } catch (error: any) {
            console.error('Error updating character:', error);
            res.status(400).json({ error: error.message });
        }
    }

    public async deleteCharacter(req: Request, res: Response): Promise<void> {
        const id = req.params.id;

        if (Number.isNaN(Number(id))) {
            res.status(400).json({ error: 'Invalid character ID' });
            return;
        }

        try {
            const deleted = await this.characterService.deleteCharacter(Number(id));

            if (deleted) {
                res.status(204).send();
            } else {
                res.status(404).json({ error: 'Character not found' });
            }
        } catch (error: any) {
            console.error('Error deleting character:', error);
            res.status(400).json({ error: error.message });
        }
    }
}
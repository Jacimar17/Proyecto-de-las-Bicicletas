import { Router } from "express";
import { CharacterController } from "./character.controller";

export class CharacterRoutes {

    public readonly router = Router();

    constructor(private readonly characterController: CharacterController) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/characters', this.characterController.getCharacters.bind(this.characterController));
        this.router.get('/character/:id', this.characterController.getCharacter.bind(this.characterController));
        this.router.post('/character', this.characterController.createCharacter.bind(this.characterController));
        this.router.put('/character/:id', this.characterController.updateCharacter.bind(this.characterController));
        this.router.delete('/character/:id', this.characterController.deleteCharacter.bind(this.characterController));
    }

}
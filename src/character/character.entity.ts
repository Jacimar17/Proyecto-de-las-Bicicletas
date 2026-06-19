export interface Character {
    id: number;
    create_time: Date;
    name: string;
    nickname: string | null;
    class_name: string | null;
    race: string | null;
    level: number;
    experience_points: number;
    health_points: number;
    mana_points: number;
    strength: number;
    agility: number;
    intelligence: number;
    defense: number;
    is_alive: boolean;
    avatar_url: string | null;
    backstory: string | null;
}

-- Create character table
CREATE TABLE IF NOT EXISTS "character" (
    id SERIAL PRIMARY KEY,
    create_time TIMESTAMP NOT NULL DEFAULT NOW(),
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    class_name VARCHAR(50),
    race VARCHAR(50),
    level INTEGER NOT NULL DEFAULT 1,
    experience_points INTEGER NOT NULL DEFAULT 0,
    health_points INTEGER NOT NULL DEFAULT 100,
    mana_points INTEGER NOT NULL DEFAULT 50,
    strength INTEGER NOT NULL DEFAULT 10,
    agility INTEGER NOT NULL DEFAULT 10,
    intelligence INTEGER NOT NULL DEFAULT 10,
    defense INTEGER NOT NULL DEFAULT 10,
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    backstory TEXT
);

-- Insert sample data
INSERT INTO "character" (name, nickname, class_name, race, level, experience_points, health_points, mana_points, strength, agility, intelligence, defense, is_alive, avatar_url, backstory)
VALUES
    ('Aragorn', 'Strider', 'Ranger', 'Human', 20, 95000, 250, 80, 18, 16, 14, 17, TRUE, NULL, 'Heir of Isildur, raised in Rivendell among the Elves.'),
    ('Gandalf', 'Mithrandir', 'Wizard', 'Maia', 50, 500000, 200, 999, 12, 10, 30, 15, TRUE, NULL, 'One of the Istari sent to Middle-earth to aid in the fight against Sauron.'),
    ('Legolas', 'Greenleaf', 'Archer', 'Elf', 35, 200000, 180, 120, 14, 25, 16, 13, TRUE, NULL, 'Prince of the Woodland Realm, son of Thranduil.'),
    ('Gimli', NULL, 'Warrior', 'Dwarf', 18, 80000, 300, 30, 20, 8, 10, 22, TRUE, NULL, 'Son of Gloin, fierce warrior and loyal companion.'),
    ('Frodo', 'Ring-bearer', 'Hobbit', 'Halfling', 5, 15000, 80, 40, 6, 14, 12, 8, TRUE, NULL, 'Nephew of Bilbo Baggins, bearer of the One Ring.');

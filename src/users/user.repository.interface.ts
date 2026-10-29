import { User } from "./user.entity";

export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByDni(dni: string): Promise<User | null>;
  findByName(name: string): Promise<User | null>;
  create(user: Omit<User, "id">): Promise<User>;
  update(id: string, user: Partial<Omit<User, "id">>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

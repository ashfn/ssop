const storage = new Map();

export default class MemoryAdapter {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  key(id: string): string {
    return `${this.name}:${id}`;
  }

  async destroy(id: string): Promise<void> {
    storage.delete(this.key(id));
  }

  async consume(id: string): Promise<void> {
    storage.delete(this.key(id));
  }

  async find(id: string): Promise<any> {
    return storage.get(this.key(id));
  }

  async findByUid(uid: string): Promise<any> {
    const found = Array.from(storage.values()).find((val: any) => val.uid === uid);
    return found;
  }

  async findByUserCode(userCode: string): Promise<any> {
    const found = Array.from(storage.values()).find((val: any) => val.userCode === userCode);
    return found;
  }

  async upsert(id: string, payload: any, expiresIn?: number): Promise<void> {
    const key = this.key(id);
    
    if (expiresIn) {
      payload.exp = Math.floor(Date.now() / 1000) + expiresIn;
    }

    storage.set(key, payload);
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const tokens = Array.from(storage.entries()).filter(([key, token]: [string, any]) => {
      return token.grantId === grantId;
    });

    tokens.forEach(([key]) => storage.delete(key));
  }

  static connect() {
    storage.clear();
  }
} 
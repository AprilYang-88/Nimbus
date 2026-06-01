# Nimbus Notes

Nimbus 是一个 AI 驱动的轻量级个人笔记 MVP。记录完成后，它会自动生成标签，并推荐值得重新连接的旧笔记。

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 <http://localhost:3000>。

## AI 模式

不配置 `LLM_API_KEY` 时，Nimbus 会使用本地分词规则生成标签和关联推荐，便于立即体验完整流程。

需要启用大模型时，在 `.env.local` 中填写任意 **OpenAI 兼容的 Chat Completions** 接口（DeepSeek、智谱 GLM、OpenAI 等均可）：

```bash
# DeepSeek
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash

# 或 智谱 GLM
# LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
# LLM_MODEL=glm-4-flash

# 或 OpenAI
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4o-mini
```

## 数据

存储后端按环境变量自动切换：

- **不设 `DATABASE_URL`（默认）**：使用本地 SQLite，数据库自动创建在 `data/nimbus.db`。该目录已加入 `.gitignore`，不会提交个人笔记。
- **设了 `DATABASE_URL`**：使用云端 Supabase / Postgres，应用首次启动时自动建表。

启用 Supabase：在 Supabase 控制台 `Project Settings → Database → Connection string` 复制连接串（建议用连接池 pooler，端口 6543），填入 `.env.local`：

```bash
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres
```

两种后端的表结构与行为一致（notes / tags / note_tags / note_links）。


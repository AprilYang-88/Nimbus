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

不配置 `OPENAI_API_KEY` 时，Nimbus 会使用本地关键词规则生成标签和关联推荐，便于立即体验完整流程。

需要启用 OpenAI 时，在 `.env.local` 中填写：

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5-mini
```

## 数据

SQLite 数据库会自动创建在 `data/nimbus.db`。该目录已加入 `.gitignore`，不会提交个人笔记。


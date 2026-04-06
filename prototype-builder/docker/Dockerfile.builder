FROM node:20-slim

# Claude Code CLI + wrangler (generator 실행용)
RUN npm install -g @anthropic-ai/claude-code wrangler

WORKDIR /app

# 로컬 빌드 산출물을 마운트하여 실행
# docker run -v $(pwd):/app -p 3001:3001 builder
CMD ["node", "dist/index.js"]

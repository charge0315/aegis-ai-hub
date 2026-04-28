FROM node:20-alpine

WORKDIR /app

# 依存関係のコピーとインストール
COPY package.json ./
RUN npm install

# ソースコードのコピー
COPY src/ ./src/
COPY tsconfig.json ./

# ポート3005を公開 (HTTP API用)
EXPOSE 3005

# tsxをインストールしてTypeScriptを直接実行
RUN npm install -g tsx

# 実行
CMD ["tsx", "src/index.ts"]
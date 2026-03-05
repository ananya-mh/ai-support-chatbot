#!/bin/bash
# Full GCP VM setup for ai-support-chatbot with RAG/Agentic extension

# 1. System updates
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# 3. Docker + Docker Compose
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

# 4. Firebase CLI
npm install -g firebase-tools
firebase --version

# 5. Pinecone Python client (for ingestion scripts if needed)
pip3 install pinecone-client --break-system-packages

# 6. Git + clone repo
sudo apt install -y git
git clone https://github.com/ananya-mh/ai-support-chatbot.git
cd ai-support-chatbot

# 7. Install dependencies (backend + frontend)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 8. Create .env template for backend
cat > backend/.env << 'ENVFILE'
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=firebase-docs
PINECONE_ENVIRONMENT=us-east-1
FIREBASE_STATUS_URL=https://status.firebase.google.com
PORT=5000
ENVFILE

echo "========================================="
echo "Setup complete!"
echo "Next steps:"
echo "  1. cd ai-support-chatbot"
echo "  2. Update backend/.env with your API keys"
echo "  3. cd backend && npm run dev"
echo "  4. cd frontend && npm start"
echo "========================================="
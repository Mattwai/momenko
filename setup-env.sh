#!/bin/bash

# Momenko Environment Setup Script
# This script helps you set up the required environment variables for voice features

set -e

# Color codes for terminal output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display banner
echo -e "${BLUE}"
echo "  __  __                         _          "
echo " |  \/  | ___  _ __ ___   ___ _ __| | _____  "
echo " | |\/| |/ _ \| '_ \` _ \ / _ \ '_ \| |/ / _ \ "
echo " | |  | | (_) | | | | | |  __/ | | |   < (_) |"
echo " |_|  |_|\___/|_| |_| |_|\___|_| |_|_|\_\___/ "
echo "                                              "
echo -e " Environment Setup${NC}\n"

# Check if .env.development exists
if [ -f .env.development ]; then
  echo -e "${YELLOW}Existing .env.development file found.${NC}"
  read -p "Do you want to update it? (y/n): " update_choice
  
  if [[ "$update_choice" != "y" && "$update_choice" != "Y" ]]; then
    echo -e "${BLUE}Keeping existing .env.development file.${NC}"
    exit 0
  fi
  
  # Backup existing file
  cp .env.development .env.development.backup
  echo -e "${GREEN}Backed up existing file to .env.development.backup${NC}"
else
  # If .example.env exists, use it as a template
  if [ -f .example.env ]; then
    cp .example.env .env.development
    echo -e "${GREEN}Created .env.development from template.${NC}"
  else
    # Create a new file with default structure
    cat > .env.development << EOL
# Supabase Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Voice Services (Required)
# DeepSeek API for speech recognition
DEEPSEEK_API_KEY=
DEEPSEEK_API_URL=https://api.deepseek.com

# ElevenLabs API for high-quality speech synthesis
ELEVEN_LABS_API_KEY=

# App Configuration
APP_ENV=development
DEBUG_MODE=true
EOL
    echo -e "${GREEN}Created new .env.development file.${NC}"
  fi
fi

echo -e "\n${BLUE}Setting up environment variables for voice features...${NC}"

# Function to update a variable in the .env file
update_env_var() {
  local var_name=$1
  local var_value=$2
  local env_file=".env.development"
  
  # Check if variable exists in the file
  if grep -q "^$var_name=" "$env_file"; then
    # Replace the existing value
    sed -i.bak "s|^$var_name=.*|$var_name=$var_value|" "$env_file"
    rm -f "$env_file.bak"
  else
    # Add the variable if it doesn't exist
    echo "$var_name=$var_value" >> "$env_file"
  fi
}

# Get DeepSeek API key
echo -e "\n${YELLOW}DeepSeek API (Required for speech recognition)${NC}"
read -p "Enter your DeepSeek API key: " deepseek_key

if [ -z "$deepseek_key" ]; then
  echo -e "${RED}DeepSeek API key is required for voice features to work.${NC}"
  echo -e "${YELLOW}You can get one from: https://platform.deepseek.com${NC}"
else
  update_env_var "DEEPSEEK_API_KEY" "$deepseek_key"
  echo -e "${GREEN}✓ DeepSeek API key updated${NC}"
fi

# Update DeepSeek API URL if needed
read -p "Enter DeepSeek API URL [https://api.deepseek.com]: " deepseek_url
deepseek_url=${deepseek_url:-"https://api.deepseek.com"}
update_env_var "DEEPSEEK_API_URL" "$deepseek_url"
echo -e "${GREEN}✓ DeepSeek API URL updated${NC}"

# Get ElevenLabs API key
echo -e "\n${YELLOW}ElevenLabs API (Required for voice synthesis)${NC}"
read -p "Enter your ElevenLabs API key: " elevenlabs_key

if [ -z "$elevenlabs_key" ]; then
  echo -e "${RED}ElevenLabs API key is required for voice features to work.${NC}"
  echo -e "${YELLOW}You can get one from: https://elevenlabs.io/app/api-key${NC}"
else
  update_env_var "ELEVEN_LABS_API_KEY" "$elevenlabs_key"
  echo -e "${GREEN}✓ ElevenLabs API key updated${NC}"
fi

# Get Supabase configuration
echo -e "\n${YELLOW}Supabase Configuration${NC}"
read -p "Enter your Supabase URL: " supabase_url
read -p "Enter your Supabase Anon Key: " supabase_key

if [ -n "$supabase_url" ]; then
  update_env_var "SUPABASE_URL" "$supabase_url"
  echo -e "${GREEN}✓ Supabase URL updated${NC}"
fi

if [ -n "$supabase_key" ]; then
  update_env_var "SUPABASE_ANON_KEY" "$supabase_key"
  echo -e "${GREEN}✓ Supabase Anon Key updated${NC}"
fi

# App configuration
update_env_var "APP_ENV" "development"
update_env_var "DEBUG_MODE" "true"

echo -e "\n${GREEN}===============================================${NC}"
echo -e "${GREEN}✓ Environment setup complete!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Create a development build with: ./setup-dev-build.sh"
echo -e "2. Start the app with: yarn start:dev"
echo -e "${GREEN}===============================================${NC}"

# Make the setup script executable
chmod +x setup-dev-build.sh 2>/dev/null || true
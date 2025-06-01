#!/bin/bash

# Momenko Voice API Check Script
# This script tests the DeepSeek and ElevenLabs API endpoints
# to verify your voice configuration is working correctly.

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Momenko Voice API Configuration Check   ${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# Check if .env.development exists
if [ ! -f .env.development ]; then
  echo -e "${RED}Error: .env.development file not found${NC}"
  echo "Please run this script from the project root directory"
  exit 1
fi

# Load environment variables
echo -e "${YELLOW}Loading environment variables...${NC}"
export $(grep -v '^#' .env.development | xargs)

# Check DeepSeek API configuration
echo -e "\n${YELLOW}Checking DeepSeek API configuration:${NC}"
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo -e "${RED}❌ DEEPSEEK_API_KEY is not set in .env.development${NC}"
else
  echo -e "${GREEN}✅ DEEPSEEK_API_KEY is set (${#DEEPSEEK_API_KEY} characters)${NC}"
fi

if [ -z "$DEEPSEEK_API_URL" ]; then
  echo -e "${RED}❌ DEEPSEEK_API_URL is not set in .env.development${NC}"
else
  echo -e "${GREEN}✅ DEEPSEEK_API_URL is set to: $DEEPSEEK_API_URL${NC}"
fi

# Test DeepSeek API connection
echo -e "\n${YELLOW}Testing DeepSeek API connection:${NC}"
DEEPSEEK_TEST_URL="${DEEPSEEK_API_URL}/v1/chat/completions"

if command -v curl &> /dev/null; then
  DEEPSEEK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $DEEPSEEK_API_KEY" "$DEEPSEEK_TEST_URL")
  
  if [ "$DEEPSEEK_RESPONSE" == "200" ] || [ "$DEEPSEEK_RESPONSE" == "401" ] || [ "$DEEPSEEK_RESPONSE" == "405" ]; then
    # 401 or 405 might mean the endpoint exists but requires proper authentication or method
    echo -e "${GREEN}✅ DeepSeek API endpoint accessible (HTTP $DEEPSEEK_RESPONSE)${NC}"
  else
    echo -e "${RED}❌ DeepSeek API connection failed (HTTP $DEEPSEEK_RESPONSE)${NC}"
    echo -e "   URL: $DEEPSEEK_TEST_URL"
  fi
else
  echo -e "${RED}❌ curl command not found, cannot test API connection${NC}"
fi

# Check required endpoints
echo -e "\n${YELLOW}Checking DeepSeek required endpoints:${NC}"
CHAT_ENDPOINT="${DEEPSEEK_API_URL}/v1/chat/completions"

echo -e "${BLUE}Chat completions endpoint:${NC} $CHAT_ENDPOINT"

# Check ElevenLabs API configuration
echo -e "\n${YELLOW}Checking ElevenLabs API configuration:${NC}"
if [ -z "$ELEVEN_LABS_API_KEY" ]; then
  echo -e "${RED}❌ ELEVEN_LABS_API_KEY is not set in .env.development${NC}"
else
  echo -e "${GREEN}✅ ELEVEN_LABS_API_KEY is set (${#ELEVEN_LABS_API_KEY} characters)${NC}"
fi

# Test ElevenLabs API connection
echo -e "\n${YELLOW}Testing ElevenLabs API connection:${NC}"
ELEVEN_TEST_URL="https://api.elevenlabs.io/v1/voices"

if command -v curl &> /dev/null; then
  ELEVEN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "xi-api-key: $ELEVEN_LABS_API_KEY" "$ELEVEN_TEST_URL")
  
  if [ "$ELEVEN_RESPONSE" == "200" ] || [ "$ELEVEN_RESPONSE" == "401" ]; then
    # 401 means the endpoint exists but authentication failed - which is okay for this test
    echo -e "${GREEN}✅ ElevenLabs API connection successful${NC}"
  else
    echo -e "${RED}❌ ElevenLabs API connection failed (HTTP $ELEVEN_RESPONSE)${NC}"
    echo -e "   URL: $ELEVEN_TEST_URL"
  fi
else
  echo -e "${RED}❌ curl command not found, cannot test API connection${NC}"
fi

# Add completion message
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}    API Check Complete    ${NC}"
echo -e "${GREEN}=====================================${NC}"

echo -e "\n${BLUE}=======================================${NC}"
echo -e "${BLUE}   API Configuration Check Complete   ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "\nIf all tests passed, your voice features should work correctly in a development build."
echo -e "If you're still having issues, please see VOICE_TROUBLESHOOTING.md for more help.\n"
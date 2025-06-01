#!/bin/bash

# Momenko Development Build Setup Script
# This script helps you set up and run a development build for Momenko

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
echo -e " Development Build Setup${NC}\n"

check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js v18 or higher.${NC}"
    exit 1
  fi
  
  NODE_VERSION=$(node -v | cut -d 'v' -f 2)
  NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}Node.js version is $NODE_VERSION. Please upgrade to v18 or higher.${NC}"
    exit 1
  fi
  
  # Check Yarn
  if ! command -v yarn &> /dev/null; then
    echo -e "${RED}Yarn is not installed. Please install Yarn.${NC}"
    exit 1
  fi
  
  # Check Expo CLI
  if ! command -v expo &> /dev/null; then
    echo -e "${YELLOW}Expo CLI not found. Installing globally...${NC}"
    npm install -g expo-cli
  fi
  
  echo -e "${GREEN}✓ All prerequisites are met.${NC}"
}

check_env_files() {
  echo -e "\n${YELLOW}Checking environment files...${NC}"
  
  if [ ! -f .env.development ]; then
    echo -e "${RED}Missing .env.development file.${NC}"
    
    if [ -f .example.env ]; then
      echo -e "${YELLOW}Creating .env.development from .example.env template...${NC}"
      cp .example.env .env.development
      echo -e "${BLUE}Please edit .env.development to include your API keys:${NC}"
      echo -e "  - DEEPSEEK_API_KEY"
      echo -e "  - DEEPSEEK_API_URL"
      echo -e "  - ELEVEN_LABS_API_KEY"
      echo -e "  - SUPABASE_URL"
      echo -e "  - SUPABASE_ANON_KEY"
    else
      echo -e "${RED}No .example.env file found to use as template.${NC}"
      echo -e "Please create a .env.development file with the necessary API keys."
      exit 1
    fi
  else
    # Check if required variables are in the .env.development file
    REQUIRED_VARS=("DEEPSEEK_API_KEY" "ELEVEN_LABS_API_KEY" "SUPABASE_URL" "SUPABASE_ANON_KEY")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
      if ! grep -q "^$var=" .env.development; then
        MISSING_VARS+=("$var")
      fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
      echo -e "${RED}Missing required variables in .env.development:${NC}"
      for var in "${MISSING_VARS[@]}"; do
        echo -e "  - $var"
      done
      echo -e "${YELLOW}Please add these variables to your .env.development file.${NC}"
    else
      echo -e "${GREEN}✓ Environment file looks good.${NC}"
    fi
  fi
}

install_dependencies() {
  echo -e "\n${YELLOW}Installing dependencies...${NC}"
  yarn install
  
  # Check if dependencies need to be added
  DEPENDENCIES=("expo-file-system" "expo-dev-client" "buffer" "expo-build-properties")
  MISSING_DEPS=()
  
  for dep in "${DEPENDENCIES[@]}"; do
    if ! grep -q "\"$dep\":" package.json; then
      MISSING_DEPS+=("$dep")
    fi
  done
  
  if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Adding missing dependencies: ${MISSING_DEPS[*]}${NC}"
    yarn add ${MISSING_DEPS[*]}
  fi
  
  echo -e "${GREEN}✓ Dependencies installed.${NC}"
}

prepare_dev_build() {
  echo -e "\n${YELLOW}Preparing development build...${NC}"
  
  # Detect platform
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "${BLUE}macOS detected. You can build for iOS and Android.${NC}"
    PLATFORM_OPTIONS="1) iOS\n2) Android\n3) Both\n4) Cancel"
    
    echo -e "${YELLOW}Select platform to build for:${NC}"
    echo -e "$PLATFORM_OPTIONS"
    read -p "Enter your choice (1-4): " platform_choice
    
    case $platform_choice in
      1) build_ios ;;
      2) build_android ;;
      3) build_both ;;
      4) exit 0 ;;
      *) echo -e "${RED}Invalid choice.${NC}"; exit 1 ;;
    esac
  else
    # Non-macOS (Linux, Windows with WSL, etc.)
    echo -e "${BLUE}Non-macOS platform detected. You can only build for Android.${NC}"
    echo -e "${YELLOW}Do you want to proceed with Android build? (y/n)${NC}"
    read -p "Enter your choice: " android_choice
    
    case $android_choice in
      [Yy]* ) build_android ;;
      * ) exit 0 ;;
    esac
  fi
}

build_ios() {
  echo -e "\n${YELLOW}Building for iOS...${NC}"
  
  # Check for Xcode
  if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}Xcode not found. Please install Xcode to build for iOS.${NC}"
    exit 1
  fi
  
  # Run prebuild
  echo -e "${BLUE}Running expo prebuild for iOS...${NC}"
  npx expo prebuild --platform ios
  
  echo -e "${GREEN}✓ iOS project created.${NC}"
  echo -e "${YELLOW}Building and running iOS app...${NC}"
  npx expo run:ios
}

build_android() {
  echo -e "\n${YELLOW}Building for Android...${NC}"
  
  # Check for ANDROID_HOME
  if [ -z "$ANDROID_HOME" ]; then
    echo -e "${YELLOW}ANDROID_HOME environment variable not set.${NC}"
    echo -e "${BLUE}You may need to set up Android SDK location manually.${NC}"
  fi
  
  # Run prebuild
  echo -e "${BLUE}Running expo prebuild for Android...${NC}"
  npx expo prebuild --platform android
  
  echo -e "${GREEN}✓ Android project created.${NC}"
  echo -e "${YELLOW}Building and running Android app...${NC}"
  npx expo run:android
}

build_both() {
  build_ios
  build_android
}

show_success_message() {
  echo -e "\n${GREEN}=============================================================${NC}"
  echo -e "${GREEN}Development build setup complete!${NC}"
  echo -e "${BLUE}Next steps:${NC}"
  echo -e "1. For iOS: Open ios/momenko.xcworkspace in Xcode"
  echo -e "2. For Android: Open android/ in Android Studio"
  echo -e "3. Use 'yarn start:dev' to start the development server"
  echo -e "${GREEN}=============================================================${NC}"
}

main() {
  check_prerequisites
  check_env_files
  install_dependencies
  prepare_dev_build
  show_success_message
}

main
export default function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          envName: 'development',
          moduleName: '@env',
          path: '.env.development',
          safe: true,
          allowUndefined: false,
          allowlist: [
            'AI_API_KEY',
            'AI_API_URL',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN'
          ]
        },
      ],
    ],
  };
} 
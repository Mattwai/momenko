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
            'DEEPSEEK_API_KEY',
            'DEEPSEEK_API_URL',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
          ]
        },
      ],
    ],
  };
} 
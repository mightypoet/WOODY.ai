const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
  const resolveUser = async (authUser: any) => {
    const email = authUser.email || '';
    if (!email) return null;
    
    // Check if user exists by email
    let matches = [];
    try {
      matches = await dbService.list('users', [{field: 'email', operator: '==', value: email}]);
    } catch(e) {
      console.warn("Error fetching users by email", e);
    }
    
    if (email === 'rohan00as@gmail.com') {
      if (matches.length > 0) {
        return matches[0];
      } else {
        const userData = {
          id: authUser.id,
          email: email,
          name: authUser.displayName || 'Admin',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        try {
          await dbService.set('users', authUser.id, userData);
        } catch(e) {}
        return userData;
      }
    } else {
      if (matches.length > 0) {
        return matches[0];
      } else {
        return null;
      }
    }
  };

  useEffect(() => {
    if (window.opener && window.name === 'oauth_popup') {
      setTimeout(() => window.close(), 1000);
    }
    
    testConnection();

    const unsubscribe = initAuth(
      async (authUser, _fToken) => {
        const resolved = await resolveUser(authUser);
        if (resolved) {
          setUser(resolved as User);
          setAccessDenied(false);
        } else {
          setUser(null);
          setAccessDenied(true);
        }
        setLoading(false);
      },
      () => {
        setUser(null);
        setAccessDenied(false);
        setLoading(false);
      }
    );
`;

content = content.replace(/  useEffect\(\(\) => \{[\s\S]*?setLoading\(false\);\n      \}\n    \);/m, replacement.trim());

// We also need to add accessDenied state
content = content.replace(/const \[supabaseConfigError, setSupabaseConfigError\] = useState<boolean>\(false\);/, 
  'const [supabaseConfigError, setSupabaseConfigError] = useState<boolean>(false);\n  const [accessDenied, setAccessDenied] = useState(false);');

// update handleLogin
content = content.replace(/      if \(result\) \{[\s\S]*?\} else \{\n        \/\/ If popup closed without result/,
`      if (result) {
        const resolved = await resolveUser(result.user);
        if (resolved) {
          setUser(resolved as User);
          setAccessDenied(false);
        } else {
          setUser(null);
          setAccessDenied(true);
        }
      } else {
        // If popup closed without result`);

// Import AccessDeniedView
content = content.replace(/import SettingsView from '\.\/components\/SettingsView';/,
`import SettingsView from './components/SettingsView';
import AccessDeniedView from './components/AccessDeniedView';`);

// render AccessDeniedView
content = content.replace(/  if \(\!user\) \{/m,
`  if (accessDenied) {
    return <AccessDeniedView />;
  }

  if (!user) {`);

fs.writeFileSync('src/App.tsx', content);

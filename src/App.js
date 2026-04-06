const ComponentFunction = function() {
  const React = require('react');
  const { useState, useEffect, useContext, useMemo, useCallback } = React;
  const {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    Modal, Alert, Platform, StatusBar, Switch, ActivityIndicator,
    KeyboardAvoidingView
  } = require('react-native');
  const { MaterialIcons } = require('@expo/vector-icons');
  const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const { useQuery, useMutation } = require('platform-hooks');
  const { useCamera } = require('platform-hooks');

  // ─── Constants ────────────────────────────────────────────────────────────
  const FIREBASE_DB = 'https://campusguide-32721-default-rtdb.firebaseio.com';
  const TAB_MENU_HEIGHT = Platform.OS === 'web' ? 56 : 49;
  const SCROLL_EXTRA_PADDING = 16;
  const WEB_TAB_MENU_PADDING = 90;
  const TOTAL_LECTURES = 6;
  const primaryColor = '#7C3AED';

  const Tab = createBottomTabNavigator();

  // ─── Firebase helpers ─────────────────────────────────────────────────────
  const fbGet = (path) =>
    fetch(FIREBASE_DB + path).then(r => r.json());

  const fbPatch = (path, data) =>
    fetch(FIREBASE_DB + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => { if (!r.ok) throw new Error('Network error'); return r.json(); });

  const fbPut = (path, data) =>
    fetch(FIREBASE_DB + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => { if (!r.ok) throw new Error('Network error'); return r.json(); });

  // ─── ThemeContext ─────────────────────────────────────────────────────────
  const ThemeContext = React.createContext();
  const ThemeProvider = function(props) {
    const darkModeState = useState(false);
    const darkMode = darkModeState[0];
    const setDarkMode = darkModeState[1];
    const lightTheme = useMemo(function() {
      return { colors: {
        primary: primaryColor, accent: '#A855F7',
        background: '#F8FAFC', card: '#FFFFFF',
        textPrimary: '#1E293B', textSecondary: '#64748B',
        border: '#E2E8F0', success: '#10B981',
        error: '#EF4444', warning: '#F59E0B'
      }};
    }, []);
    const darkTheme = useMemo(function() {
      return { colors: {
        primary: primaryColor, accent: '#A855F7',
        background: '#0F172A', card: '#1E293B',
        textPrimary: '#F1F5F9', textSecondary: '#94A3B8',
        border: '#334155', success: '#10B981',
        error: '#EF4444', warning: '#F59E0B'
      }};
    }, []);
    const theme = darkMode ? darkTheme : lightTheme;
    const toggleDarkMode = useCallback(function() { setDarkMode(function(p) { return !p; }); }, []);
    const value = useMemo(function() { return { theme: theme, darkMode: darkMode, toggleDarkMode: toggleDarkMode }; }, [theme, darkMode, toggleDarkMode]);
    return React.createElement(ThemeContext.Provider, { value: value }, props.children);
  };
  const useTheme = function() { return useContext(ThemeContext); };

  // ─── AuthContext ──────────────────────────────────────────────────────────
  const AuthContext = React.createContext();
  const AuthProvider = function(props) {
    const profState = useState(null);
    const loggedInProfessor = profState[0];
    const setLoggedInProfessor = profState[1];
    const login  = useCallback(function(prof) { setLoggedInProfessor(prof); }, []);
    const logout = useCallback(function() { setLoggedInProfessor(null); }, []);
    const value  = useMemo(function() { return { loggedInProfessor: loggedInProfessor, login: login, logout: logout }; }, [loggedInProfessor]);
    return React.createElement(AuthContext.Provider, { value: value }, props.children);
  };
  const useAuth = function() { return useContext(AuthContext); };

  // ─── Toast hook ───────────────────────────────────────────────────────────
  const useToast = function() {
    const toastState = useState({ visible: false, message: '', type: 'success' });
    const toast = toastState[0];
    const setToast = toastState[1];
    const showToast = useCallback(function(message, type, duration) {
      if (type === undefined) type = 'success';
      if (duration === undefined) duration = 3000;
      setToast({ visible: true, message: message, type: type });
      if (duration > 0) setTimeout(function() { setToast({ visible: false, message: '', type: 'success' }); }, duration);
    }, []);
    return { toast: toast, showToast: showToast };
  };

  // ─── Toast component ──────────────────────────────────────────────────────
  const Toast = function(props) {
    const toast = props.toast;
    const insets = props.insets;
    if (!toast.visible) return null;
    const bgColor = toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : toast.type === 'loading' ? primaryColor : '#3B82F6';
    const iconName = toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'error' : 'hourglass-empty';
    return React.createElement(View, {
      style: [styles.toastContainer, { backgroundColor: bgColor, bottom: ((insets && insets.bottom) || 0) + 20 }]
    },
      React.createElement(View, { style: styles.toastContent },
        React.createElement(MaterialIcons, { name: iconName, size: 20, color: '#FFF' }),
        React.createElement(Text, { style: styles.toastMessage }, toast.message)
      )
    );
  };

  // ─── QRScanner modal ──────────────────────────────────────────────────────
  const QRScanner = function(props) {
    const visible = props.visible;
    const onClose = props.onClose;
    const onScan = props.onScan;
    const theme = props.theme;
    const insetsTop = props.insetsTop;
    const insetsBottom = props.insetsBottom;
    const isLoading = props.isLoading;

    const mockScanState = useState('');
    const mockScan = mockScanState[0];
    const setMockScan = mockScanState[1];

    const handleMockScan = function() {
      if (mockScan.trim()) { onScan(mockScan.trim()); setMockScan(''); }
    };

    return React.createElement(Modal, { visible: visible, transparent: true, animationType: 'slide', onRequestClose: onClose },
      React.createElement(View, { style: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', marginTop: insetsTop } },
        React.createElement(View, { style: styles.scannerHeader },
          React.createElement(TouchableOpacity, { onPress: onClose, style: styles.scannerCloseButton },
            React.createElement(MaterialIcons, { name: 'close', size: 28, color: '#FFF' })
          ),
          React.createElement(Text, { style: styles.scannerTitle }, 'Scan Room QR Code')
        ),
        React.createElement(View, { style: styles.scannerContent },
          React.createElement(View, { style: styles.scannerFrame },
            React.createElement(View, { style: [styles.scannerCorner, styles.scannerCornerTopLeft] }),
            React.createElement(View, { style: [styles.scannerCorner, styles.scannerCornerTopRight] }),
            React.createElement(View, { style: [styles.scannerCorner, styles.scannerCornerBottomLeft] }),
            React.createElement(View, { style: [styles.scannerCorner, styles.scannerCornerBottomRight] }),
            React.createElement(Text, { style: styles.scannerInstructions }, 'Position room QR code within the frame')
          )
        ),
        React.createElement(View, { style: [styles.scannerFooter, { paddingBottom: insetsBottom + 20 }] },
          React.createElement(Text, { style: styles.mockScanLabel }, 'Test Mode — Enter Room Code:'),
          React.createElement(View, { style: { position: 'relative' } },
            React.createElement(TextInput, {
              value: mockScan, onChangeText: setMockScan,
              placeholder: 'e.g., G104', placeholderTextColor: '#94A3B8',
              style: styles.mockScanInput, autoCapitalize: 'characters'
            }),
            mockScan.trim() ? React.createElement(TouchableOpacity, {
              onPress: function() { setMockScan(''); },
              style: { position: 'absolute', right: 12, top: 10 }
            }, React.createElement(MaterialIcons, { name: 'close', size: 20, color: '#94A3B8' })) : null
          ),
          React.createElement(TouchableOpacity, {
            onPress: handleMockScan, disabled: isLoading,
            style: [styles.mockScanButton, { backgroundColor: isLoading ? '#94A3B8' : primaryColor }]
          },
            React.createElement(Text, { style: styles.mockScanButtonText }, isLoading ? 'Updating...' : 'Simulate Scan')
          )
        )
      )
    );
  };

  // ─── LoginScreen ──────────────────────────────────────────────────────────
  const LoginScreen = function() {
    const themeCtx = useTheme();
    const theme = themeCtx.theme;
    const authCtx = useAuth();
    const login = authCtx.login;
    const insets = useSafeAreaInsets();
    const toastHook = useToast();
    const toast = toastHook.toast;
    const showToast = toastHook.showToast;

    const emailState = useState('');
    const email = emailState[0];
    const setEmail = emailState[1];
    const passwordState = useState('');
    const password = passwordState[0];
    const setPassword = passwordState[1];
    const loadingState = useState(false);
    const loading = loadingState[0];
    const setLoading = loadingState[1];
    const showPassState = useState(false);
    const showPass = showPassState[0];
    const setShowPass = showPassState[1];

    const handleLogin = function() {
      if (!email.trim() || !password.trim()) {
        showToast('Please enter email and password', 'error'); return;
      }
      setLoading(true);
      showToast('Signing in...', 'loading', 0);
      fbGet('/Professor.json').then(function(data) {
        if (!data) throw new Error('No professors found');
        var found = null;
        Object.keys(data).forEach(function(key) {
          var prof = data[key];
          if (typeof prof === 'object' && prof.email && prof.password) {
            if (prof.email.toLowerCase().trim() === email.toLowerCase().trim() && prof.password === password) {
              found = Object.assign({ key: key }, prof);
            }
          }
        });
        if (!found) { showToast('Invalid email or password', 'error'); setLoading(false); return; }
        login(found);
      }).catch(function(e) {
        showToast('Login failed: ' + e.message, 'error'); setLoading(false);
      });
    };

    return React.createElement(KeyboardAvoidingView, {
      style: { flex: 1, backgroundColor: theme.colors.background },
      behavior: Platform.OS === 'ios' ? 'padding' : 'height'
    },
      React.createElement(ScrollView, {
        contentContainerStyle: {
          flexGrow: 1, justifyContent: 'center',
          paddingHorizontal: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40
        }
      },
        // Logo
        React.createElement(View, { style: { alignItems: 'center', marginBottom: 40 } },
          React.createElement(View, {
            style: {
              width: 84, height: 84, borderRadius: 24, backgroundColor: primaryColor,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              shadowColor: primaryColor, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4, shadowRadius: 16, elevation: 12
            }
          },
            React.createElement(MaterialIcons, { name: 'qr-code-scanner', size: 42, color: '#FFF' })
          ),
          React.createElement(Text, { style: { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 6 } },
            'Professor Room Tracker'
          ),
          React.createElement(Text, { style: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center' } },
            'Sign in to update your room location'
          )
        ),

        // Card
        React.createElement(View, {
          style: {
            backgroundColor: theme.colors.card, borderRadius: 20, padding: 24,
            borderWidth: 1, borderColor: theme.colors.border,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08, shadowRadius: 12, elevation: 4
          }
        },
          React.createElement(Text, { style: [styles.inputLabel, { color: theme.colors.textPrimary }] }, 'Email'),
          React.createElement(View, { style: [styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }] },
            React.createElement(MaterialIcons, { name: 'email', size: 18, color: theme.colors.textSecondary, style: { marginRight: 10 } }),
            React.createElement(TextInput, {
              value: email, onChangeText: setEmail,
              placeholder: 'your@college.edu', placeholderTextColor: theme.colors.textSecondary,
              keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false,
              style: [styles.inputField, { color: theme.colors.textPrimary }], editable: !loading
            })
          ),

          React.createElement(Text, { style: [styles.inputLabel, { color: theme.colors.textPrimary, marginTop: 16 }] }, 'Password'),
          React.createElement(View, { style: [styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }] },
            React.createElement(MaterialIcons, { name: 'lock', size: 18, color: theme.colors.textSecondary, style: { marginRight: 10 } }),
            React.createElement(TextInput, {
              value: password, onChangeText: setPassword,
              placeholder: 'Enter your password', placeholderTextColor: theme.colors.textSecondary,
              secureTextEntry: !showPass,
              style: [styles.inputField, { color: theme.colors.textPrimary, flex: 1 }], editable: !loading
            }),
            React.createElement(TouchableOpacity, { onPress: function() { setShowPass(function(p) { return !p; }); }, style: { padding: 4 } },
              React.createElement(MaterialIcons, { name: showPass ? 'visibility-off' : 'visibility', size: 20, color: theme.colors.textSecondary })
            )
          ),

          React.createElement(TouchableOpacity, {
            onPress: handleLogin, disabled: loading,
            style: {
              marginTop: 24, backgroundColor: loading ? theme.colors.border : primaryColor,
              borderRadius: 12, padding: 16, alignItems: 'center',
              shadowColor: primaryColor, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: loading ? 0 : 0.3, shadowRadius: 8, elevation: loading ? 0 : 6
            }
          },
            loading
              ? React.createElement(ActivityIndicator, { color: '#FFF', size: 'small' })
              : React.createElement(Text, { style: { color: '#FFF', fontSize: 16, fontWeight: '700' } }, 'Sign In')
          )
        ),

        React.createElement(Text, {
          style: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 24, fontSize: 13 }
        }, 'Contact your administrator if you need access')
      ),
      React.createElement(Toast, { toast: toast, insets: insets })
    );
  };

  // ─── HomeScreen ───────────────────────────────────────────────────────────
  const HomeScreen = function() {
    const themeCtx = useTheme();
    const theme = themeCtx.theme;
    const authCtx = useAuth();
    const loggedInProfessor = authCtx.loggedInProfessor;
    const logout = authCtx.logout;
    const insets = useSafeAreaInsets();
    const toastHook = useToast();
    const toast = toastHook.toast;
    const showToast = toastHook.showToast;

    const scanningState = useState(false);
    const scanning = scanningState[0];
    const setScanning = scanningState[1];
    const lastScanState = useState(null);
    const lastScan = lastScanState[0];
    const setLastScan = lastScanState[1];
    const loadingState = useState(false);
    const isLoading = loadingState[0];
    const setIsLoading = loadingState[1];

    const cameraHook = useCamera();
    const requestCameraPermission = cameraHook.requestCameraPermission;
    const cameraPermissionStatus = cameraHook.cameraPermissionStatus;

    const scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING;

    const handleStartScanning = function() {
      if (cameraPermissionStatus !== 'granted') {
        requestCameraPermission().then(function() {
          if (cameraPermissionStatus === 'granted') setScanning(true);
          else showToast('Camera permission required', 'error');
        });
      } else { setScanning(true); }
    };

    const handleQRScan = useCallback(function(roomCode) {
      setScanning(false);
      setIsLoading(true);
      showToast('Updating location...', 'loading', 0);
      fbPatch('/Professor/' + loggedInProfessor.key + '.json', { current_room: roomCode })
        .then(function() {
          setLastScan({ roomCode: roomCode, timestamp: new Date().toLocaleTimeString() });
          showToast('Room updated to ' + roomCode, 'success');
        })
        .catch(function(e) { showToast('Failed: ' + e.message, 'error'); })
        .finally(function() { setIsLoading(false); });
    }, [loggedInProfessor]);

    if (!loggedInProfessor) return null;

    const schedule = loggedInProfessor.schedule || {};
    const scheduledLectures = Array.from({ length: TOTAL_LECTURES }, function(_, i) {
      return { num: i + 1, room: schedule['lecture_' + (i + 1)] || '' };
    });

    return React.createElement(View, { style: { flex: 1, backgroundColor: theme.colors.background } },
      React.createElement(ScrollView, {
        style: { flex: 1 },
        contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding }
      },
        // Header
        React.createElement(View, { style: [styles.header, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }] },
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] },
              'Hello, ' + (loggedInProfessor.name || loggedInProfessor.key)
            ),
            React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] },
              loggedInProfessor.current_room ? 'Currently in: ' + loggedInProfessor.current_room : 'No room assigned yet'
            )
          ),
          React.createElement(TouchableOpacity, {
            onPress: logout,
            style: { marginTop: 4, padding: 8, borderRadius: 10, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }
          },
            React.createElement(MaterialIcons, { name: 'logout', size: 20, color: theme.colors.textSecondary })
          )
        ),

        // Scan button
        React.createElement(View, { style: styles.scanSection },
          React.createElement(TouchableOpacity, {
            onPress: handleStartScanning, disabled: isLoading,
            style: [styles.scanButton, { backgroundColor: isLoading ? theme.colors.border : primaryColor, opacity: isLoading ? 0.7 : 1 }]
          },
            React.createElement(MaterialIcons, { name: 'qr-code-scanner', size: 48, color: '#FFF' }),
            React.createElement(Text, { style: styles.scanButtonText }, 'Scan Room QR Code'),
            React.createElement(Text, { style: styles.scanButtonSubtext }, 'Tap to open camera')
          )
        ),

        // Last scan
        lastScan ? React.createElement(View, { style: { paddingHorizontal: 20, marginBottom: 24 } },
          React.createElement(Text, { style: [styles.sectionTitle, { color: theme.colors.textPrimary }] }, 'Last Update'),
          React.createElement(View, { style: [styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.success, borderWidth: 2 }] },
            React.createElement(MaterialIcons, { name: 'check-circle', size: 24, color: theme.colors.success }),
            React.createElement(View, { style: { marginLeft: 12, flex: 1 } },
              React.createElement(Text, { style: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary } }, 'Moved to ' + lastScan.roomCode),
              React.createElement(Text, { style: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 } }, 'Updated at ' + lastScan.timestamp)
            )
          )
        ) : null,

        // Schedule
        React.createElement(View, { style: { paddingHorizontal: 20 } },
          React.createElement(Text, { style: [styles.sectionTitle, { color: theme.colors.textPrimary }] }, "Today's Schedule"),
          React.createElement(View, {
            style: { backgroundColor: theme.colors.card, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }
          },
            scheduledLectures.map(function(lec, idx) {
              return React.createElement(View, {
                key: lec.num,
                style: {
                  flexDirection: 'row', alignItems: 'center', padding: 14,
                  borderBottomWidth: idx < TOTAL_LECTURES - 1 ? 1 : 0,
                  borderBottomColor: theme.colors.border
                }
              },
                React.createElement(View, {
                  style: {
                    width: 32, height: 32, borderRadius: 8, marginRight: 12,
                    backgroundColor: lec.room ? primaryColor + '20' : theme.colors.background,
                    alignItems: 'center', justifyContent: 'center'
                  }
                },
                  React.createElement(Text, { style: { fontSize: 13, fontWeight: '800', color: lec.room ? primaryColor : theme.colors.textSecondary } }, lec.num.toString())
                ),
                React.createElement(Text, { style: { fontSize: 14, color: theme.colors.textSecondary, flex: 1 } }, 'Lecture ' + lec.num),
                lec.room
                  ? React.createElement(View, { style: { backgroundColor: primaryColor + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 } },
                      React.createElement(Text, { style: { fontSize: 13, fontWeight: '700', color: primaryColor } }, lec.room)
                    )
                  : React.createElement(Text, { style: { fontSize: 13, color: theme.colors.textSecondary } }, '—')
              );
            })
          )
        )
      ),
      React.createElement(QRScanner, {
        visible: scanning, onClose: function() { setScanning(false); },
        onScan: handleQRScan, theme: theme,
        insetsTop: insets.top, insetsBottom: insets.bottom, isLoading: isLoading
      }),
      React.createElement(Toast, { toast: toast, insets: insets })
    );
  };

  // ─── ScheduleScreen ───────────────────────────────────────────────────────
  const ScheduleScreen = function() {
    const themeCtx = useTheme();
    const theme = themeCtx.theme;
    const authCtx = useAuth();
    const loggedInProfessor = authCtx.loggedInProfessor;
    const login = authCtx.login;
    const insets = useSafeAreaInsets();
    const toastHook = useToast();
    const toast = toastHook.toast;
    const showToast = toastHook.showToast;

    const scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING;

    const initRooms = function() {
      var s = (loggedInProfessor && loggedInProfessor.schedule) || {};
      return Array.from({ length: TOTAL_LECTURES }, function(_, i) { return s['lecture_' + (i + 1)] || ''; });
    };

    const roomsState = useState(initRooms);
    const rooms = roomsState[0];
    const setRooms = roomsState[1];
    const savingState = useState(false);
    const saving = savingState[0];
    const setSaving = savingState[1];

    const updateRoom = function(idx, val) {
      setRooms(function(prev) { var n = prev.slice(); n[idx] = val; return n; });
    };

    const handleSave = function() {
      setSaving(true);
      showToast('Saving schedule...', 'loading', 0);
      var schedule = {};
      rooms.forEach(function(room, i) { schedule['lecture_' + (i + 1)] = room.trim(); });
      fbPatch('/Professor/' + loggedInProfessor.key + '.json', { schedule: schedule })
        .then(function() {
          login(Object.assign({}, loggedInProfessor, { schedule: schedule }));
          showToast('Schedule saved!', 'success');
        })
        .catch(function(e) { showToast('Failed: ' + e.message, 'error'); })
        .finally(function() { setSaving(false); });
    };

    if (!loggedInProfessor) return null;

    return React.createElement(View, { style: { flex: 1, backgroundColor: theme.colors.background } },
      React.createElement(ScrollView, {
        style: { flex: 1 },
        contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding }
      },
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] }, 'My Schedule'),
          React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] }, 'Set which room each lecture is in')
        ),

        React.createElement(View, { style: { paddingHorizontal: 20 } },
          Array.from({ length: TOTAL_LECTURES }, function(_, i) {
            return React.createElement(View, {
              key: i,
              style: {
                backgroundColor: theme.colors.card, borderRadius: 14,
                borderWidth: 1, borderColor: rooms[i] ? primaryColor + '40' : theme.colors.border,
                padding: 16, marginBottom: 12,
                flexDirection: 'row', alignItems: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
              }
            },
              React.createElement(View, {
                style: {
                  width: 44, height: 44, borderRadius: 12, marginRight: 14,
                  backgroundColor: rooms[i] ? primaryColor : theme.colors.background,
                  borderWidth: rooms[i] ? 0 : 1, borderColor: theme.colors.border,
                  alignItems: 'center', justifyContent: 'center'
                }
              },
                React.createElement(Text, {
                  style: { fontSize: 16, fontWeight: '800', color: rooms[i] ? '#FFF' : theme.colors.textSecondary }
                }, (i + 1).toString())
              ),
              React.createElement(View, { style: { flex: 1 } },
                React.createElement(Text, { style: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 } }, 'LECTURE ' + (i + 1)),
                React.createElement(TextInput, {
                  value: rooms[i],
                  onChangeText: function(v) { updateRoom(i, v); },
                  placeholder: 'e.g., B504, ECEB, CSITA',
                  placeholderTextColor: theme.colors.textSecondary,
                  autoCapitalize: 'characters',
                  editable: !saving,
                  style: {
                    fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary,
                    padding: 0, borderBottomWidth: 1.5,
                    borderBottomColor: rooms[i] ? primaryColor : theme.colors.border,
                    paddingBottom: 4
                  }
                })
              ),
              rooms[i] ? React.createElement(TouchableOpacity, {
                onPress: function() { updateRoom(i, ''); },
                style: { padding: 6, marginLeft: 8 }
              }, React.createElement(MaterialIcons, { name: 'close', size: 18, color: theme.colors.textSecondary })) : null
            );
          }),

          React.createElement(TouchableOpacity, {
            onPress: handleSave, disabled: saving,
            style: {
              marginTop: 8, backgroundColor: saving ? theme.colors.border : primaryColor,
              borderRadius: 14, padding: 18, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center',
              shadowColor: primaryColor, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: saving ? 0 : 0.3, shadowRadius: 8, elevation: saving ? 0 : 6
            }
          },
            saving
              ? React.createElement(ActivityIndicator, { color: '#FFF' })
              : React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center' } },
                  React.createElement(MaterialIcons, { name: 'save', size: 20, color: '#FFF', style: { marginRight: 8 } }),
                  React.createElement(Text, { style: { color: '#FFF', fontSize: 16, fontWeight: '700' } }, 'Save Schedule')
                )
          )
        )
      ),
      React.createElement(Toast, { toast: toast, insets: insets })
    );
  };

  // ─── RecordsScreen ────────────────────────────────────────────────────────
  const RecordsScreen = function() {
    const themeCtx = useTheme();
    const theme = themeCtx.theme;
    const insets = useSafeAreaInsets();
    const scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING;

    const professorsState = useState(null);
    const professors = professorsState[0];
    const setProfessors = professorsState[1];
    const loadingState = useState(true);
    const loading = loadingState[0];
    const setLoading = loadingState[1];

    const fetchData = function() {
      setLoading(true);
      fbGet('/Professor.json').then(function(data) {
        if (data) {
          var list = Object.keys(data).map(function(key) {
            var val = data[key];
            if (typeof val === 'object') return Object.assign({ key: key }, val);
            return { key: key, name: key, current_room: val };
          });
          setProfessors(list);
        } else { setProfessors([]); }
      }).catch(function() { setProfessors([]); }).finally(function() { setLoading(false); });
    };

    useEffect(function() { fetchData(); }, []);

    return React.createElement(View, { style: { flex: 1, backgroundColor: theme.colors.background } },
      React.createElement(ScrollView, {
        style: { flex: 1 },
        contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding }
      },
        React.createElement(View, { style: [styles.header, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }] },
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] }, 'Room Assignments'),
            React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] }, 'Live view of all professor locations')
          ),
          React.createElement(TouchableOpacity, {
            onPress: fetchData,
            style: { marginTop: 4, padding: 10, borderRadius: 10, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }
          },
            React.createElement(MaterialIcons, { name: 'refresh', size: 20, color: primaryColor })
          )
        ),

        loading
          ? React.createElement(ActivityIndicator, { style: { marginTop: 60 }, size: 'large', color: primaryColor })
          : (professors && professors.length > 0)
            ? React.createElement(View, { style: { paddingHorizontal: 20 } },
                professors.map(function(prof) {
                  return React.createElement(View, {
                    key: prof.key,
                    style: {
                      backgroundColor: theme.colors.card, borderRadius: 16,
                      borderWidth: 1, borderColor: theme.colors.border,
                      marginBottom: 14, overflow: 'hidden',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06, shadowRadius: 6, elevation: 2
                    }
                  },
                    // Header row
                    React.createElement(View, {
                      style: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                    },
                      React.createElement(View, {
                        style: { width: 40, height: 40, borderRadius: 12, backgroundColor: primaryColor + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }
                      },
                        React.createElement(MaterialIcons, { name: 'person', size: 22, color: primaryColor })
                      ),
                      React.createElement(View, { style: { flex: 1 } },
                        React.createElement(Text, { style: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary } }, prof.name || prof.key),
                        prof.email ? React.createElement(Text, { style: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 } }, prof.email) : null
                      ),
                      prof.current_room
                        ? React.createElement(View, { style: { backgroundColor: theme.colors.success + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 } },
                            React.createElement(Text, { style: { fontSize: 13, fontWeight: '700', color: theme.colors.success } }, prof.current_room)
                          )
                        : React.createElement(View, { style: { backgroundColor: theme.colors.warning + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 } },
                            React.createElement(Text, { style: { fontSize: 12, fontWeight: '600', color: theme.colors.warning } }, 'No room')
                          )
                    ),
                    // Schedule chips
                    prof.schedule ? React.createElement(View, { style: { padding: 12 } },
                      React.createElement(Text, { style: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 } }, 'LECTURE SCHEDULE'),
                      React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap' } },
                        Array.from({ length: TOTAL_LECTURES }, function(_, i) {
                          var room = prof.schedule['lecture_' + (i + 1)];
                          return React.createElement(View, {
                            key: i,
                            style: {
                              flexDirection: 'row', alignItems: 'center', marginRight: 6, marginBottom: 6,
                              backgroundColor: room ? primaryColor + '12' : theme.colors.background,
                              borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
                              borderWidth: 1, borderColor: room ? primaryColor + '30' : theme.colors.border
                            }
                          },
                            React.createElement(Text, { style: { fontSize: 11, fontWeight: '700', color: room ? primaryColor : theme.colors.textSecondary, marginRight: 4 } }, 'L' + (i + 1)),
                            React.createElement(Text, { style: { fontSize: 12, color: room ? theme.colors.textPrimary : theme.colors.textSecondary } }, room || '—')
                          );
                        })
                      )
                    ) : null
                  );
                })
              )
            : React.createElement(View, { style: styles.emptyState },
                React.createElement(MaterialIcons, { name: 'assignment', size: 64, color: theme.colors.textSecondary }),
                React.createElement(Text, { style: [styles.emptyStateText, { color: theme.colors.textSecondary }] }, 'No records found'),
                React.createElement(Text, { style: [styles.emptyStateSubtext, { color: theme.colors.textSecondary }] }, 'Professor data will appear here')
              )
      )
    );
  };

  // ─── SettingsScreen ───────────────────────────────────────────────────────
  const SettingsScreen = function() {
    const themeCtx = useTheme();
    const theme = themeCtx.theme;
    const darkMode = themeCtx.darkMode;
    const toggleDarkMode = themeCtx.toggleDarkMode;
    const authCtx = useAuth();
    const loggedInProfessor = authCtx.loggedInProfessor;
    const logout = authCtx.logout;
    const insets = useSafeAreaInsets();
    const toastHook = useToast();
    const toast = toastHook.toast;
    const showToast = toastHook.showToast;

    const scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING;

    const showAddModalState = useState(false);
    const showAddModal = showAddModalState[0];
    const setShowAddModal = showAddModalState[1];
    const formState = useState({ name: '', email: '', password: '' });
    const form = formState[0];
    const setForm = formState[1];
    const savingState = useState(false);
    const saving = savingState[0];
    const setSaving = savingState[1];

    const handleAddProfessor = function() {
      if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
        showToast('All fields are required', 'error'); return;
      }
      setSaving(true);
      var key = form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      fbPut('/Professor/' + key + '.json', {
        name: form.name.trim(), email: form.email.trim(), password: form.password,
        current_room: '',
        schedule: { lecture_1: '', lecture_2: '', lecture_3: '', lecture_4: '', lecture_5: '', lecture_6: '' }
      }).then(function() {
        showToast('Professor added!', 'success');
        setForm({ name: '', email: '', password: '' });
        setShowAddModal(false);
      }).catch(function(e) { showToast('Failed: ' + e.message, 'error'); })
        .finally(function() { setSaving(false); });
    };

    const SettingRow = function(rowProps) {
      return React.createElement(View, {
        style: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: theme.colors.card, borderRadius: 14,
          borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 10
        }
      },
        React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', flex: 1 } },
          React.createElement(View, {
            style: { width: 36, height: 36, borderRadius: 10, backgroundColor: primaryColor + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }
          },
            React.createElement(MaterialIcons, { name: rowProps.icon, size: 20, color: primaryColor })
          ),
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary } }, rowProps.title),
            rowProps.subtitle ? React.createElement(Text, { style: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 } }, rowProps.subtitle) : null
          )
        ),
        rowProps.right || null
      );
    };

    return React.createElement(View, { style: { flex: 1, backgroundColor: theme.colors.background } },
      React.createElement(ScrollView, {
        style: { flex: 1 },
        contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding }
      },
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] }, 'Settings'),
          React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] }, 'Preferences & administration')
        ),

        React.createElement(View, { style: { paddingHorizontal: 20 } },

          // Profile card
          React.createElement(View, {
            style: {
              backgroundColor: primaryColor, borderRadius: 18, padding: 20, marginBottom: 24,
              shadowColor: primaryColor, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 12, elevation: 8
            }
          },
            React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center' } },
              React.createElement(View, {
                style: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }
              },
                React.createElement(MaterialIcons, { name: 'person', size: 28, color: '#FFF' })
              ),
              React.createElement(View, { style: { flex: 1 } },
                React.createElement(Text, { style: { fontSize: 17, fontWeight: '800', color: '#FFF' } }, (loggedInProfessor && loggedInProfessor.name) || (loggedInProfessor && loggedInProfessor.key) || 'Unknown'),
                React.createElement(Text, { style: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 } }, (loggedInProfessor && loggedInProfessor.email) || '')
              )
            ),
            loggedInProfessor && loggedInProfessor.current_room ? React.createElement(View, {
              style: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center' }
            },
              React.createElement(MaterialIcons, { name: 'location-on', size: 16, color: '#FFF', style: { marginRight: 6 } }),
              React.createElement(Text, { style: { color: '#FFF', fontSize: 14, fontWeight: '600' } }, 'Currently in: ' + loggedInProfessor.current_room)
            ) : null
          ),

          React.createElement(Text, { style: [styles.sectionLabel, { color: theme.colors.textSecondary }] }, 'APPEARANCE'),
          React.createElement(SettingRow, {
            icon: 'dark-mode', title: 'Dark Mode', subtitle: 'Switch to dark theme',
            right: React.createElement(Switch, { value: darkMode, onValueChange: toggleDarkMode, trackColor: { false: theme.colors.border, true: primaryColor }, thumbColor: '#FFF' })
          }),

          React.createElement(Text, { style: [styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 8 }] }, 'ADMINISTRATION'),
          React.createElement(TouchableOpacity, { onPress: function() { setShowAddModal(true); } },
            React.createElement(SettingRow, {
              icon: 'person-add', title: 'Add New Professor',
              subtitle: 'Create professor account with login credentials',
              right: React.createElement(MaterialIcons, { name: 'chevron-right', size: 20, color: theme.colors.textSecondary })
            })
          ),

          React.createElement(Text, { style: [styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 8 }] }, 'ABOUT'),
          React.createElement(SettingRow, { icon: 'info', title: 'Professor Room Tracker', subtitle: 'Version 2.0.0', right: null }),

          React.createElement(TouchableOpacity, {
            onPress: logout,
            style: {
              marginTop: 8, backgroundColor: theme.colors.error + '15',
              borderRadius: 14, padding: 16, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center',
              borderWidth: 1, borderColor: theme.colors.error + '30'
            }
          },
            React.createElement(MaterialIcons, { name: 'logout', size: 20, color: theme.colors.error, style: { marginRight: 8 } }),
            React.createElement(Text, { style: { color: theme.colors.error, fontSize: 15, fontWeight: '700' } }, 'Sign Out')
          )
        )
      ),

      // Add Professor Modal
      React.createElement(Modal, {
        visible: showAddModal, transparent: true, animationType: 'slide',
        onRequestClose: function() { setShowAddModal(false); }
      },
        React.createElement(KeyboardAvoidingView, {
          style: { flex: 1 }, behavior: Platform.OS === 'ios' ? 'padding' : 'height'
        },
          React.createElement(View, { style: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' } },
            React.createElement(View, {
              style: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }
            },
              React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
                React.createElement(Text, { style: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary } }, 'Add Professor'),
                React.createElement(TouchableOpacity, { onPress: function() { setShowAddModal(false); } },
                  React.createElement(MaterialIcons, { name: 'close', size: 24, color: theme.colors.textSecondary })
                )
              ),
              [
                { label: 'Full Name', key: 'name', placeholder: 'e.g., Dr. K.P. Singh', icon: 'person', cap: 'words' },
                { label: 'Email', key: 'email', placeholder: 'e.g., kp@college.edu', icon: 'email', keyboard: 'email-address', cap: 'none' },
                { label: 'Password', key: 'password', placeholder: 'Set a password', icon: 'lock', secure: true, cap: 'none' }
              ].map(function(field) {
                return React.createElement(View, { key: field.key, style: { marginBottom: 14 } },
                  React.createElement(Text, { style: [styles.inputLabel, { color: theme.colors.textPrimary }] }, field.label),
                  React.createElement(View, { style: [styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }] },
                    React.createElement(MaterialIcons, { name: field.icon, size: 18, color: theme.colors.textSecondary, style: { marginRight: 8 } }),
                    React.createElement(TextInput, {
                      value: form[field.key],
                      onChangeText: function(v) { setForm(function(p) { return Object.assign({}, p, { [field.key]: v }); }); },
                      placeholder: field.placeholder, placeholderTextColor: theme.colors.textSecondary,
                      keyboardType: field.keyboard || 'default',
                      autoCapitalize: field.cap || 'none',
                      secureTextEntry: !!field.secure,
                      style: [styles.inputField, { color: theme.colors.textPrimary, flex: 1 }]
                    })
                  )
                );
              }),
              React.createElement(TouchableOpacity, {
                onPress: handleAddProfessor, disabled: saving,
                style: { backgroundColor: saving ? theme.colors.border : primaryColor, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6 }
              },
                saving ? React.createElement(ActivityIndicator, { color: '#FFF' }) : React.createElement(Text, { style: { color: '#FFF', fontSize: 16, fontWeight: '700' } }, 'Add Professor')
              )
            )
          )
        )
      ),

      React.createElement(Toast, { toast: toast, insets: insets })
    );
  };

  // ─── TabNavigator ─────────────────────────────────────────────────────────
  const TabNavigator = function() {
    var insets = useSafeAreaInsets();
    var themeCtx = useTheme();
    var theme = themeCtx.theme;
    return React.createElement(View, { style: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' } },
      React.createElement(Tab.Navigator, {
        screenOptions: {
          headerShown: false,
          tabBarStyle: {
            position: 'absolute', bottom: 0,
            height: TAB_MENU_HEIGHT + insets.bottom, borderTopWidth: 0,
            backgroundColor: theme.colors.card,
            shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08, shadowRadius: 8, elevation: 8
          },
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
        }
      },
        React.createElement(Tab.Screen, { name: 'Scanner', component: HomeScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'qr-code-scanner', size: 24, color: p.color }); } } }),
        React.createElement(Tab.Screen, { name: 'Schedule', component: ScheduleScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'calendar-today', size: 24, color: p.color }); } } }),
        React.createElement(Tab.Screen, { name: 'Records', component: RecordsScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'assignment', size: 24, color: p.color }); } } }),
        React.createElement(Tab.Screen, { name: 'Settings', component: SettingsScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'settings', size: 24, color: p.color }); } } })
      )
    );
  };

  // ─── Styles ───────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    header: { padding: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
    headerSubtitle: { fontSize: 15, lineHeight: 22 },
    sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 2 },
    infoCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
    scanSection: { paddingHorizontal: 20, marginBottom: 24 },
    scanButton: { alignItems: 'center', justifyContent: 'center', padding: 32, borderRadius: 20 },
    scanButtonText: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 12 },
    scanButtonSubtext: { color: '#FFF', fontSize: 14, opacity: 0.85, marginTop: 4 },
    inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    inputField: { fontSize: 15 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyStateText: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
    emptyStateSubtext: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 20 },
    scannerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center', flex: 1 },
    scannerCloseButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
    scannerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    scannerFrame: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    scannerCorner: { position: 'absolute', width: 32, height: 32, borderColor: '#FFF', borderWidth: 3 },
    scannerCornerTopLeft:     { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    scannerCornerTopRight:    { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    scannerCornerBottomLeft:  { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    scannerCornerBottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scannerInstructions: { color: '#FFF', fontSize: 15, textAlign: 'center', opacity: 0.8 },
    scannerFooter: { paddingHorizontal: 20, paddingTop: 20 },
    mockScanLabel: { color: '#FFF', fontSize: 13, marginBottom: 8 },
    mockScanInput: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: 12, color: '#FFF', fontSize: 15 },
    mockScanButton: { marginTop: 12, padding: 16, borderRadius: 12, alignItems: 'center' },
    mockScanButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    toastContainer: { position: 'absolute', left: 20, right: 20, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
    toastContent: { flexDirection: 'row', alignItems: 'center' },
    toastMessage: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 }
  });

  // ─── Root ─────────────────────────────────────────────────────────────────
  const Root = function() {
    var authCtx = useAuth();
    return authCtx.loggedInProfessor ? React.createElement(TabNavigator) : React.createElement(LoginScreen);
  };

  return React.createElement(ThemeProvider, null,
    React.createElement(AuthProvider, null,
      React.createElement(View, { style: { flex: 1, width: '100%', height: '100%' } },
        React.createElement(StatusBar, { barStyle: 'dark-content' }),
        React.createElement(Root)
      )
    )
  );
};

module.exports = ComponentFunction;

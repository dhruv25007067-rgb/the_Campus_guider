const ComponentFunction = function() {
  const React = require('react');
  const { useState, useEffect, useContext, useMemo, useCallback } = React;
  const { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform, StatusBar, Switch, ActivityIndicator, KeyboardAvoidingView, FlatList, Image } = require('react-native');
  const { MaterialIcons } = require('@expo/vector-icons');
  const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const { useQuery, useMutation } = require('platform-hooks');
  const { useCamera } = require('platform-hooks');

  var TAB_MENU_HEIGHT = Platform.OS === 'web' ? 56 : 49;
  var SCROLL_EXTRA_PADDING = 16;
  var WEB_TAB_MENU_PADDING = 90;
  var FAB_SPACING = 16;

  const storageStrategy = 'all-local';
  const primaryColor = '#7C3AED';
  const accentColor = '#A855F7';
  const backgroundColor = '#F8FAFC';
  const cardColor = '#FFFFFF';
  const textPrimary = '#1E293B';
  const textSecondary = '#64748B';
  const designStyle = 'professional';

  const Tab = createBottomTabNavigator();

  const ThemeContext = React.createContext();
  const ThemeProvider = function(props) {
    const darkModeState = useState(false);
    const darkMode = darkModeState[0];
    const setDarkMode = darkModeState[1];
    const lightTheme = useMemo(function() {
      return {
        colors: {
          primary: primaryColor,
          accent: accentColor,
          background: backgroundColor,
          card: cardColor,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
          border: '#E2E8F0',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B'
        }
      };
    }, []);
    const darkTheme = useMemo(function() {
      return {
        colors: {
          primary: primaryColor,
          accent: accentColor,
          background: '#0F172A',
          card: '#1E293B',
          textPrimary: '#F1F5F9',
          textSecondary: '#94A3B8',
          border: '#334155',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B'
        }
      };
    }, []);
    const theme = darkMode ? darkTheme : lightTheme;
    const toggleDarkMode = useCallback(function() {
      setDarkMode(function(prev) { return !prev; });
    }, []);
    const value = useMemo(function() {
      return { theme: theme, darkMode: darkMode, toggleDarkMode: toggleDarkMode, designStyle: designStyle };
    }, [theme, darkMode, toggleDarkMode]);
    return React.createElement(ThemeContext.Provider, { value: value }, props.children);
  };
  const useTheme = function() { return useContext(ThemeContext); };

  const useHomeScreenState = function() {
    var themeContext = useTheme();
    var theme = themeContext.theme;
    var scanningState = useState(false);
    var scanning = scanningState[0];
    var setScanning = scanningState[1];
    var lastScanState = useState(null);
    var lastScan = lastScanState[0];
    var setLastScan = lastScanState[1];
    var selectedProfessorState = useState(null);
    var selectedProfessor = selectedProfessorState[0];
    var setSelectedProfessor = selectedProfessorState[1];
    var showProfessorModalState = useState(false);
    var showProfessorModal = showProfessorModalState[0];
    var setShowProfessorModal = showProfessorModalState[1];
    var showToastState = useState({ visible: false, message: '', type: 'success' });
    var showToast = showToastState[0];
    var setShowToast = showToastState[1];
    var loadingState = useState(false);
    var isLoading = loadingState[0];
    var setIsLoading = loadingState[1];

    return {
      theme, scanning, setScanning, lastScan, setLastScan,
      selectedProfessor, setSelectedProfessor, showProfessorModal,
      setShowProfessorModal, showToast, setShowToast, isLoading, setIsLoading
    };
  };

  const useHomeScreenHandlers = function(state) {
    const { useCamera } = require('platform-hooks');
    const { takePhoto, requestCameraPermission, cameraPermissionStatus } = useCamera();
    const firebaseDB = 'https://campusguide-32721-default-rtdb.firebaseio.com';
    const { mutate: updateProfessor } = useMutation('professors', 'update');
    const { data: professors } = useQuery('professors');

    const handleStartScanning = useCallback(function() {
      if (!state.selectedProfessor) {
        Platform.OS === 'web'
          ? window.alert('Please select your profile first')
          : Alert.alert('Profile Required', 'Please select your professor profile before scanning room QR codes');
        return;
      }
      if (cameraPermissionStatus !== 'granted') {
        requestCameraPermission().then(function() {
          if (cameraPermissionStatus === 'granted') {
            state.setScanning(true);
          } else {
            Platform.OS === 'web'
              ? window.alert('Camera permission required')
              : Alert.alert('Permission Required', 'Camera access is needed to scan QR codes');
          }
        });
      } else {
        state.setScanning(true);
      }
    }, [cameraPermissionStatus, state.selectedProfessor]);

    const handleQRScan = useCallback(function(data) {
      try {
        var roomCode = data.trim();
        if (!state.selectedProfessor) {
          Platform.OS === 'web'
            ? window.alert('Please select a professor profile first')
            : Alert.alert('Profile Required', 'Please select a professor profile before scanning');
          return;
        }
        state.setScanning(false);
        state.setShowToast({ visible: true, message: 'Updating database...', type: 'loading' });

        var professorName = state.selectedProfessor.name.toLowerCase().replace(/\s+/g, '_');
        var updateUrl = firebaseDB + '/Professor.json';

        fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [professorName]: roomCode })
        })
          .then(function(response) {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
          })
          .then(function(data) {
            state.setLastScan({
              professorName: state.selectedProfessor.name,
              roomCode: roomCode,
              timestamp: new Date().toLocaleTimeString()
            });
            state.setShowToast({
              visible: true,
              message: state.selectedProfessor.name + ' successfully moved to ' + roomCode,
              type: 'success'
            });
            setTimeout(function() {
              state.setShowToast({ visible: false, message: '', type: 'success' });
            }, 3000);
          })
          .catch(function(error) {
            Platform.OS === 'web'
              ? window.alert('Error: ' + error.message)
              : Alert.alert('Error', 'Failed to update room assignment: ' + error.message);
            state.setShowToast({ visible: true, message: 'Failed to update database', type: 'error' });
            setTimeout(function() {
              state.setShowToast({ visible: false, message: '', type: 'error' });
            }, 3000);
          });
      } catch (e) {
        Platform.OS === 'web'
          ? window.alert('Invalid QR code')
          : Alert.alert('Invalid QR Code', 'Unable to read QR code. Please try again.');
      }
    }, [state.selectedProfessor]);

    const handleProfessorSelect = useCallback(function(professor) {
      state.setSelectedProfessor(professor);
      state.setShowProfessorModal(false);
    }, []);

    return { handleStartScanning, handleQRScan, handleProfessorSelect, professors: professors || [] };
  };

  var ProfessorSelectModal = function(props) {
    var { visible, onClose, professors, onSelect, theme, insetsTop, insetsBottom } = props;
    return React.createElement(Modal, { visible, transparent: true, animationType: 'slide', onRequestClose: onClose },
      React.createElement(View, { style: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', marginTop: insetsTop } },
        React.createElement(View, { style: { flex: 1, maxHeight: '70%', marginHorizontal: 20, backgroundColor: theme.colors.card, borderRadius: 12, padding: 20, paddingBottom: insetsBottom + 20 } },
          React.createElement(View, { style: styles.modalHeader },
            React.createElement(Text, { style: [styles.modalTitle, { color: theme.colors.textPrimary }] }, 'Select Your Profile'),
            React.createElement(TouchableOpacity, { onPress: onClose, style: styles.modalCloseButton },
              React.createElement(MaterialIcons, { name: 'close', size: 24, color: theme.colors.textSecondary })
            )
          ),
          React.createElement(ScrollView, { style: { flex: 1, marginTop: 16 } },
            professors.length === 0
              ? React.createElement(View, { style: styles.emptyState },
                  React.createElement(MaterialIcons, { name: 'person', size: 48, color: theme.colors.textSecondary }),
                  React.createElement(Text, { style: [styles.emptyStateText, { color: theme.colors.textSecondary }] }, 'No professors available'),
                  React.createElement(Text, { style: [styles.emptyStateSubtext, { color: theme.colors.textSecondary }] }, 'Add professors in the Settings tab first')
                )
              : professors.map(function(professor) {
                  return React.createElement(TouchableOpacity, { key: professor.id, onPress: function() { onSelect(professor); }, style: [styles.professorItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }] },
                    React.createElement(View, { style: styles.professorItemContent },
                      React.createElement(MaterialIcons, { name: 'person', size: 24, color: theme.colors.primary }),
                      React.createElement(View, { style: styles.professorItemText },
                        React.createElement(Text, { style: [styles.professorItemTitle, { color: theme.colors.textPrimary }] }, professor.name || 'Unnamed Professor'),
                        professor.assigned_room ? React.createElement(Text, { style: [styles.professorItemRoom, { color: theme.colors.textSecondary }] }, 'Current room: ' + professor.assigned_room) : null
                      )
                    ),
                    React.createElement(MaterialIcons, { name: 'chevron-right', size: 24, color: theme.colors.textSecondary })
                  );
                })
          )
        )
      )
    );
  };

  var QRScanner = function(props) {
    var { visible, onClose, onScan, theme, insetsTop, insetsBottom } = props;
    var mockScanState = useState('');
    var mockScan = mockScanState[0];
    var setMockScan = mockScanState[1];

    var handleMockScan = function() {
      if (mockScan.trim()) { onScan(mockScan.trim()); setMockScan(''); }
    };

    return React.createElement(Modal, { visible, transparent: true, animationType: 'slide', onRequestClose: onClose },
      React.createElement(View, { style: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', marginTop: insetsTop } },
        React.createElement(View, { style: styles.scannerHeader },
          React.createElement(TouchableOpacity, { onPress: onClose, style: styles.scannerCloseButton },
            React.createElement(MaterialIcons, { name: 'close', size: 28, color: '#FFFFFF' })
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
          React.createElement(Text, { style: styles.mockScanLabel }, 'Test Mode - Enter Room Code:'),
          React.createElement(View, { style: { position: 'relative' } },
            React.createElement(TextInput, { value: mockScan, onChangeText: setMockScan, placeholder: 'e.g., G104', placeholderTextColor: '#94A3B8', style: styles.mockScanInput }),
            mockScan.trim() ? React.createElement(TouchableOpacity, { onPress: function() { setMockScan(''); }, style: { position: 'absolute', right: 12, top: 10 } },
              React.createElement(MaterialIcons, { name: 'close', size: 20, color: '#94A3B8' })
            ) : null
          ),
          React.createElement(TouchableOpacity, { onPress: handleMockScan, style: [styles.mockScanButton, { backgroundColor: props.isLoading ? '#94A3B8' : theme.colors.primary }], disabled: props.isLoading },
            React.createElement(Text, { style: styles.mockScanButtonText }, props.isLoading ? 'Updating...' : 'Simulate Scan')
          )
        )
      )
    );
  };

  const HomeScreen = function() {
    const state = useHomeScreenState();
    const handlers = useHomeScreenHandlers(state);
    const insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);

    return React.createElement(View, { style: { flex: 1, backgroundColor: state.theme.colors.background } },
      React.createElement(ScrollView, { style: { flex: 1 }, contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding } },
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: [styles.headerTitle, { color: state.theme.colors.textPrimary }] }, 'Professor Room Tracker'),
          React.createElement(Text, { style: [styles.headerSubtitle, { color: state.theme.colors.textSecondary }] }, 'Scan QR codes to update room location')
        ),
        React.createElement(View, { style: styles.professorSection },
          React.createElement(Text, { style: [styles.sectionTitle, { color: state.theme.colors.textPrimary }] }, 'Your Profile'),
          React.createElement(TouchableOpacity, { onPress: function() { state.setShowProfessorModal(true); }, style: [styles.professorCard, { backgroundColor: state.theme.colors.card, borderColor: state.theme.colors.border }] },
            React.createElement(View, { style: styles.professorCardContent },
              React.createElement(MaterialIcons, { name: 'person', size: 24, color: state.selectedProfessor ? state.theme.colors.primary : state.theme.colors.textSecondary }),
              React.createElement(View, { style: styles.professorCardText },
                React.createElement(Text, { style: [styles.professorCardTitle, { color: state.selectedProfessor ? state.theme.colors.textPrimary : state.theme.colors.textSecondary }] }, state.selectedProfessor ? state.selectedProfessor.name : 'Select your profile'),
                state.selectedProfessor && state.selectedProfessor.assigned_room ? React.createElement(Text, { style: [styles.professorCardRoom, { color: state.theme.colors.textSecondary }] }, 'Current room: ' + state.selectedProfessor.assigned_room) : null
              )
            ),
            React.createElement(MaterialIcons, { name: 'chevron-right', size: 24, color: state.theme.colors.textSecondary })
          )
        ),
        React.createElement(View, { style: styles.scanSection },
          React.createElement(TouchableOpacity, { onPress: handlers.handleStartScanning, disabled: !state.selectedProfessor, style: [styles.scanButton, { backgroundColor: state.selectedProfessor ? state.theme.colors.primary : state.theme.colors.border, opacity: state.selectedProfessor ? 1 : 0.6 }] },
            React.createElement(MaterialIcons, { name: 'qr-code-scanner', size: 48, color: '#FFFFFF' }),
            React.createElement(Text, { style: styles.scanButtonText }, 'Scan Room QR Code'),
            React.createElement(Text, { style: styles.scanButtonSubtext }, state.selectedProfessor ? 'Tap to open camera' : 'Select your profile first')
          )
        ),
        state.lastScan ? React.createElement(View, { style: styles.lastScanSection },
          React.createElement(Text, { style: [styles.sectionTitle, { color: state.theme.colors.textPrimary }] }, 'Last Update'),
          React.createElement(View, { style: [styles.lastScanCard, { backgroundColor: state.theme.colors.card, borderColor: state.theme.colors.success }] },
            React.createElement(MaterialIcons, { name: 'check-circle', size: 24, color: state.theme.colors.success }),
            React.createElement(View, { style: styles.lastScanContent },
              React.createElement(Text, { style: [styles.lastScanName, { color: state.theme.colors.textPrimary }] }, state.lastScan.professorName),
              React.createElement(Text, { style: [styles.lastScanRoom, { color: state.theme.colors.textSecondary }] }, 'Room: ' + state.lastScan.roomCode),
              React.createElement(Text, { style: [styles.lastScanTime, { color: state.theme.colors.textSecondary }] }, 'Updated at ' + state.lastScan.timestamp)
            )
          )
        ) : null
      ),
      React.createElement(ProfessorSelectModal, { visible: state.showProfessorModal, onClose: function() { state.setShowProfessorModal(false); }, professors: handlers.professors, onSelect: handlers.handleProfessorSelect, theme: state.theme, insetsTop: insets.top, insetsBottom: insets.bottom }),
      React.createElement(QRScanner, { visible: state.scanning, onClose: function() { state.setScanning(false); }, onScan: handlers.handleQRScan, theme: state.theme, insetsTop: insets.top, insetsBottom: insets.bottom }),
      state.showToast.visible ? React.createElement(View, { style: [styles.toastContainer, { backgroundColor: state.showToast.type === 'success' ? state.theme.colors.success : state.theme.colors.error, bottom: insets.bottom + 20 }] },
        React.createElement(View, { style: styles.toastContent },
          React.createElement(MaterialIcons, { name: state.showToast.type === 'success' ? 'check-circle' : 'error', size: 20, color: '#FFFFFF' }),
          React.createElement(Text, { style: styles.toastMessage }, state.showToast.message)
        )
      ) : null
    );
  };

  const SessionsScreen = function() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);
    const { data: professors, loading: professorsLoading, refetch: refetchProfessors } = useQuery('professors');
    const { mutate: insertProfessor } = useMutation('professors', 'insert');
    const { mutate: deleteProfessor } = useMutation('professors', 'delete');
    const [showAddModal, setShowAddModal] = useState(false);
    const [professorName, setProfessorName] = useState('');
    const [professorEmail, setProfessorEmail] = useState('');

    const handleAddProfessor = function() {
      if (!professorName.trim()) {
        Platform.OS === 'web' ? window.alert('Please enter a professor name') : Alert.alert('Required', 'Please enter a professor name');
        return;
      }
      var professorData = { id: Date.now().toString(), name: professorName.trim(), email: professorEmail.trim(), assigned_room: '', created_at: new Date().toISOString() };
      insertProfessor(professorData).then(function() {
        refetchProfessors(); setProfessorName(''); setProfessorEmail(''); setShowAddModal(false);
        Platform.OS === 'web' ? window.alert('Professor added successfully!') : Alert.alert('Success', 'Professor added successfully!');
      }).catch(function(error) {
        Platform.OS === 'web' ? window.alert('Error: ' + error.message) : Alert.alert('Error', 'Failed to add professor: ' + error.message);
      });
    };

    const handleDeleteProfessor = function(professorId) {
      var confirmAction = function() {
        deleteProfessor({ id: professorId }).then(function() {
          refetchProfessors();
        }).catch(function(error) {
          Platform.OS === 'web' ? window.alert('Error: ' + error.message) : Alert.alert('Error', 'Failed to delete professor: ' + error.message);
        });
      };
      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to delete this professor?')) confirmAction();
      } else {
        Alert.alert('Delete Professor', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Delete', onPress: confirmAction, style: 'destructive' }]);
      }
    };

    var fabBottom = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + FAB_SPACING);

    return React.createElement(View, { style: { flex: 1, backgroundColor: theme.colors.background } },
      React.createElement(ScrollView, { style: { flex: 1 }, contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding } },
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] }, 'Manage Professors'),
          React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] }, 'Add and manage professor profiles')
        ),
        professorsLoading
          ? React.createElement(ActivityIndicator, { style: { flex: 1, marginTop: 50 }, size: 'large', color: theme.colors.primary })
          : (professors && professors.length > 0)
            ? professors.map(function(professor) {
                return React.createElement(View, { key: professor.id, style: [styles.professorListItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] },
                  React.createElement(View, { style: styles.professorListContent },
                    React.createElement(MaterialIcons, { name: 'person', size: 24, color: theme.colors.primary }),
                    React.createElement(View, { style: styles.professorListText },
                      React.createElement(Text, { style: [styles.professorListTitle, { color: theme.colors.textPrimary }] }, professor.name),
                      React.createElement(Text, { style: [styles.professorListRoom, { color: theme.colors.textSecondary }] }, professor.assigned_room ? 'Room: ' + professor.assigned_room : 'No room assigned')
                    )
                  ),
                  React.createElement(TouchableOpacity, { onPress: function() { handleDeleteProfessor(professor.id); }, style: styles.deleteButton },
                    React.createElement(MaterialIcons, { name: 'delete', size: 20, color: theme.colors.error })
                  )
                );
              })
            : React.createElement(View, { style: styles.emptyState },
                React.createElement(MaterialIcons, { name: 'person', size: 64, color: theme.colors.textSecondary }),
                React.createElement(Text, { style: [styles.emptyStateText, { color: theme.colors.textSecondary }] }, 'No professors yet'),
                React.createElement(Text, { style: [styles.emptyStateSubtext, { color: theme.colors.textSecondary }] }, 'Add professor profiles to start tracking room locations')
              )
      ),
      React.createElement(TouchableOpacity, { onPress: function() { setShowAddModal(true); }, style: [styles.fab, { backgroundColor: theme.colors.primary, bottom: fabBottom }] },
        React.createElement(MaterialIcons, { name: 'add', size: 24, color: '#FFFFFF' })
      ),
      React.createElement(Modal, { visible: showAddModal, transparent: true, animationType: 'slide', onRequestClose: function() { setShowAddModal(false); } },
        React.createElement(View, { style: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', marginTop: insets.top } },
          React.createElement(View, { style: { flex: 1, maxHeight: '60%', marginHorizontal: 20, backgroundColor: theme.colors.card, borderRadius: 12, padding: 20, paddingBottom: insets.bottom + 20 } },
            React.createElement(View, { style: styles.modalHeader },
              React.createElement(Text, { style: [styles.modalTitle, { color: theme.colors.textPrimary }] }, 'Add Professor'),
              React.createElement(TouchableOpacity, { onPress: function() { setShowAddModal(false); }, style: styles.modalCloseButton },
                React.createElement(MaterialIcons, { name: 'close', size: 24, color: theme.colors.textSecondary })
              )
            ),
            React.createElement(View, { style: { marginTop: 16 } },
              React.createElement(Text, { style: [styles.inputLabel, { color: theme.colors.textPrimary }] }, 'Professor Name'),
              React.createElement(TextInput, { value: professorName, onChangeText: setProfessorName, placeholder: 'e.g., Dr. Sharma', placeholderTextColor: theme.colors.textSecondary, style: [styles.textInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.textPrimary }] }),
              React.createElement(Text, { style: [styles.inputLabel, { color: theme.colors.textPrimary, marginTop: 16 }] }, 'Email (optional)'),
              React.createElement(TextInput, { value: professorEmail, onChangeText: setProfessorEmail, placeholder: 'e.g., sharma@university.edu', placeholderTextColor: theme.colors.textSecondary, keyboardType: 'email-address', autoCapitalize: 'none', style: [styles.textInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.textPrimary }] }),
              React.createElement(TouchableOpacity, { onPress: handleAddProfessor, style: [styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: 20 }] },
                React.createElement(Text, { style: styles.primaryButtonText }, 'Add Professor')
              )
            )
          )
        )
      )
    );
  };

  const RecordsScreen = function() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);
    const { data: professors, loading: professorsLoading } = useQuery('professors');

    return React.createElement(View, { style: { flex: 1, backgroundColor: theme.colors.background } },
      React.createElement(ScrollView, { style: { flex: 1 }, contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding } },
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] }, 'Room Assignments'),
          React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] }, 'View current professor room locations')
        ),
        professorsLoading
          ? React.createElement(ActivityIndicator, { style: { flex: 1, marginTop: 50 }, size: 'large', color: theme.colors.primary })
          : (professors && professors.length > 0)
            ? professors.map(function(professor) {
                return React.createElement(View, { key: professor.id, style: [styles.recordItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] },
                  React.createElement(View, { style: styles.recordItemContent },
                    React.createElement(MaterialIcons, { name: 'person', size: 24, color: theme.colors.primary }),
                    React.createElement(View, { style: styles.recordItemText },
                      React.createElement(Text, { style: [styles.recordItemName, { color: theme.colors.textPrimary }] }, professor.name || 'Unknown Professor'),
                      React.createElement(Text, { style: [styles.recordItemRoom, { color: theme.colors.textSecondary }] }, professor.assigned_room ? 'Room: ' + professor.assigned_room : 'No room assigned')
                    )
                  ),
                  professor.assigned_room
                    ? React.createElement(MaterialIcons, { name: 'check-circle', size: 20, color: theme.colors.success })
                    : React.createElement(MaterialIcons, { name: 'schedule', size: 20, color: theme.colors.warning })
                );
              })
            : React.createElement(View, { style: styles.emptyState },
                React.createElement(MaterialIcons, { name: 'assignment', size: 64, color: theme.colors.textSecondary }),
                React.createElement(Text, { style: [styles.emptyStateText, { color: theme.colors.textSecondary }] }, 'No room assignments yet'),
                React.createElement(Text, { style: [styles.emptyStateSubtext, { color: theme.colors.textSecondary }] }, 'Start scanning QR codes to assign professors to rooms')
              )
      )
    );
  };

  const SettingsScreen = function() {
    const themeContext = useTheme();
    const { theme } = themeContext;
    const insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);
    const { data: professors } = useQuery('professors');
    var totalProfessors = professors ? professors.length : 0;
    var assignedRooms = professors ? professors.filter(function(p) { return p.assigned_room && p.assigned_room.trim(); }).length : 0;

    return React.createElement(ScrollView, { style: { flex: 1, backgroundColor: theme.colors.background }, contentContainerStyle: { paddingTop: insets.top, paddingBottom: scrollBottomPadding } },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: [styles.headerTitle, { color: theme.colors.textPrimary }] }, 'Settings'),
        React.createElement(Text, { style: [styles.headerSubtitle, { color: theme.colors.textSecondary }] }, 'App configuration and statistics')
      ),
      React.createElement(View, { style: styles.statsSection },
        React.createElement(Text, { style: [styles.sectionTitle, { color: theme.colors.textPrimary }] }, 'Statistics'),
        React.createElement(View, { style: styles.statsGrid },
          React.createElement(View, { style: [styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] },
            React.createElement(MaterialIcons, { name: 'person', size: 32, color: theme.colors.primary }),
            React.createElement(Text, { style: [styles.statNumber, { color: theme.colors.textPrimary }] }, totalProfessors),
            React.createElement(Text, { style: [styles.statLabel, { color: theme.colors.textSecondary }] }, 'Professors')
          ),
          React.createElement(View, { style: [styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] },
            React.createElement(MaterialIcons, { name: 'location-on', size: 32, color: theme.colors.success }),
            React.createElement(Text, { style: [styles.statNumber, { color: theme.colors.textPrimary }] }, assignedRooms),
            React.createElement(Text, { style: [styles.statLabel, { color: theme.colors.textSecondary }] }, 'Room Assignments')
          )
        )
      ),
      React.createElement(View, { style: styles.settingsSection },
        React.createElement(Text, { style: [styles.sectionTitle, { color: theme.colors.textPrimary }] }, 'Appearance'),
        React.createElement(View, { style: [styles.settingItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] },
          React.createElement(View, { style: styles.settingItemLeft },
            React.createElement(MaterialIcons, { name: 'dark-mode', size: 24, color: theme.colors.textSecondary }),
            React.createElement(View, { style: styles.settingItemText },
              React.createElement(Text, { style: [styles.settingItemTitle, { color: theme.colors.textPrimary }] }, 'Dark Mode'),
              React.createElement(Text, { style: [styles.settingItemSubtitle, { color: theme.colors.textSecondary }] }, 'Switch between light and dark themes')
            )
          ),
          React.createElement(Switch, { value: themeContext.darkMode, onValueChange: themeContext.toggleDarkMode, trackColor: { false: theme.colors.border, true: theme.colors.primary }, thumbColor: '#FFFFFF' })
        )
      ),
      React.createElement(View, { style: styles.aboutSection },
        React.createElement(Text, { style: [styles.sectionTitle, { color: theme.colors.textPrimary }] }, 'About'),
        React.createElement(View, { style: [styles.aboutCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }] },
          React.createElement(Image, { source: { uri: 'IMAGE:professor-teaching-classroom' }, style: styles.aboutImage }),
          React.createElement(Text, { style: [styles.aboutTitle, { color: theme.colors.textPrimary }] }, 'Professor Room Tracker'),
          React.createElement(Text, { style: [styles.aboutDescription, { color: theme.colors.textSecondary }] }, 'A QR code scanning app for updating professor room locations. Scan room QR codes to instantly log professor location changes and maintain accurate room assignment records.'),
          React.createElement(Text, { style: [styles.aboutVersion, { color: theme.colors.textSecondary }] }, 'Version 1.0.0')
        )
      )
    );
  };

  const TabNavigator = function() {
    var insets = useSafeAreaInsets();
    var { theme } = useTheme();
    return React.createElement(View, { style: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' } },
      React.createElement(Tab.Navigator, { screenOptions: { headerShown: false, tabBarStyle: { position: 'absolute', bottom: 0, height: TAB_MENU_HEIGHT + insets.bottom, borderTopWidth: 0, backgroundColor: theme.colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textSecondary, tabBarLabelStyle: { fontSize: 12, fontWeight: '500' } } },
        React.createElement(Tab.Screen, { name: 'Scanner', component: HomeScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'qr-code-scanner', size: 24, color: p.color }); } } }),
        React.createElement(Tab.Screen, { name: 'Professors', component: SessionsScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'person', size: 24, color: p.color }); } } }),
        React.createElement(Tab.Screen, { name: 'Records', component: RecordsScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'assignment', size: 24, color: p.color }); } } }),
        React.createElement(Tab.Screen, { name: 'Settings', component: SettingsScreen, options: { tabBarIcon: function(p) { return React.createElement(MaterialIcons, { name: 'settings', size: 24, color: p.color }); } } })
      )
    );
  };

  const styles = StyleSheet.create({
    header: { padding: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
    headerSubtitle: { fontSize: 16, lineHeight: 22 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    professorSection: { paddingHorizontal: 20, marginBottom: 24 },
    professorCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    professorCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    professorCardText: { marginLeft: 12, flex: 1 },
    professorCardTitle: { fontSize: 16, fontWeight: '600' },
    professorCardRoom: { fontSize: 14, marginTop: 2 },
    scanSection: { paddingHorizontal: 20, marginBottom: 24 },
    scanButton: { alignItems: 'center', justifyContent: 'center', padding: 32, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
    scanButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
    scanButtonSubtext: { color: '#FFFFFF', fontSize: 14, opacity: 0.9, marginTop: 4 },
    lastScanSection: { paddingHorizontal: 20 },
    lastScanCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 12, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    lastScanContent: { marginLeft: 12, flex: 1 },
    lastScanName: { fontSize: 16, fontWeight: '600' },
    lastScanRoom: { fontSize: 14, marginTop: 4 },
    lastScanTime: { fontSize: 12, marginTop: 4 },
    professorListItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    professorListContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    professorListText: { marginLeft: 12, flex: 1 },
    professorListTitle: { fontSize: 16, fontWeight: '600' },
    professorListRoom: { fontSize: 14, marginTop: 2 },
    deleteButton: { padding: 8, borderRadius: 8 },
    fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalCloseButton: { padding: 4 },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    textInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
    primaryButton: { padding: 16, borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyStateText: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
    emptyStateSubtext: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    professorItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    professorItemContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    professorItemText: { marginLeft: 12, flex: 1 },
    professorItemTitle: { fontSize: 16, fontWeight: '600' },
    professorItemRoom: { fontSize: 14, marginTop: 2 },
    scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 20 },
    scannerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1 },
    scannerCloseButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
    scannerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    scannerFrame: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    scannerCorner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFFFFF', borderWidth: 3 },
    scannerCornerTopLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    scannerCornerTopRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    scannerCornerBottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    scannerCornerBottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scannerInstructions: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', opacity: 0.8 },
    scannerFooter: { paddingHorizontal: 20, paddingTop: 20 },
    mockScanLabel: { color: '#FFFFFF', fontSize: 14, marginBottom: 8 },
    mockScanInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14, minHeight: 40 },
    mockScanButton: { marginTop: 12, padding: 16, borderRadius: 10, alignItems: 'center' },
    mockScanButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    recordItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    recordItemContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    recordItemText: { marginLeft: 12, flex: 1 },
    recordItemName: { fontSize: 16, fontWeight: '600' },
    recordItemRoom: { fontSize: 14, marginTop: 2 },
    statsSection: { paddingHorizontal: 20, marginBottom: 32 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statCard: { flex: 1, alignItems: 'center', padding: 20, marginHorizontal: 4, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    statNumber: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
    statLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
    settingsSection: { paddingHorizontal: 20, marginBottom: 32 },
    settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    settingItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingItemText: { marginLeft: 12, flex: 1 },
    settingItemTitle: { fontSize: 16, fontWeight: '600' },
    settingItemSubtitle: { fontSize: 14, marginTop: 2, lineHeight: 18 },
    aboutSection: { paddingHorizontal: 20, marginBottom: 32 },
    aboutCard: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    aboutImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, backgroundColor: '#E2E8F0' },
    aboutTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    aboutDescription: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
    aboutVersion: { fontSize: 12, fontWeight: '500' },
    toastContainer: { position: 'absolute', left: 20, right: 20, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
    toastContent: { flexDirection: 'row', alignItems: 'center' },
    toastMessage: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginLeft: 12, flex: 1 }
  });

  return React.createElement(ThemeProvider, null,
    React.createElement(View, { style: { flex: 1, width: '100%', height: '100%' } },
      React.createElement(StatusBar, { barStyle: 'dark-content' }),
      React.createElement(TabNavigator)
    )
  );
};

module.exports = ComponentFunction;

import React, { createContext, useContext, useState, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View, I18nManager } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CustomDrawerContent from '@/components/CustomDrawerContent'

const DRAWER_WIDTH = 280
const DrawerContext = createContext({ toggle: () => { } })

export const useDrawer = () => useContext(DrawerContext)

export const SimpleDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets()
  const isRTL = I18nManager.isRTL
  const [visible, setVisible] = useState(false)
  const slideAnim = useRef(new Animated.Value(isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const toggle = () => {
    const isOpening = !visible
    const toValue = isOpening ? 0 : (isRTL ? DRAWER_WIDTH : -DRAWER_WIDTH)
    const opacityValue = isOpening ? 1 : 0

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: opacityValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (!isOpening) {
        setVisible(false)
      }
    })

    if (isOpening) {
      setVisible(true)
    }
  }

  return (
    <DrawerContext.Provider value={{ toggle }}>
      <View style={{ flex: 1 }}>
        {visible && (
          <Animated.View style={[styles.overlay, { opacity: opacityAnim, marginTop: insets.top, marginBottom: insets.bottom }]}>
            <Pressable style={{ flex: 1 }} onPress={toggle} />
          </Animated.View>
        )}

        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            styles.drawer,
            isRTL ? styles.drawerRTL : styles.drawerLTR,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <CustomDrawerContent closeDrawer={toggle} />
        </Animated.View>

        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </DrawerContext.Provider>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'transparent',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  drawerLTR: {
    left: 0,
  },
  drawerRTL: {
    right: 0,
  },
})

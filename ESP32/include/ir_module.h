#pragma once

#include <Arduino.h>

class IRModule
{
public:
    IRModule(uint8_t reservoirPin,
             uint8_t turbinePin,
             uint8_t reservoirEmptyLevel = HIGH,
             uint8_t turbineBlockedLevel = HIGH,
             unsigned long debounceMs = 30);

    void begin();
    void update();

    bool isReservoirEmpty() const;
    bool isTurbineBlocked() const;

    bool hasReservoirStateChanged();
    bool hasTurbineStateChanged();

    bool isJamDetected(unsigned long jamThresholdMs) const;

private:
    uint8_t _reservoirPin;
    uint8_t _turbinePin;
    uint8_t _reservoirEmptyLevel;
    uint8_t _turbineBlockedLevel;
    unsigned long _debounceMs;

    bool _reservoirEmpty;
    bool _turbineBlocked;
    bool _reservoirChanged;
    bool _turbineChanged;

    uint8_t _lastReservoirRaw;
    uint8_t _lastTurbineRaw;
    unsigned long _lastReservoirRawChangeMs;
    unsigned long _lastTurbineRawChangeMs;
    unsigned long _turbineBlockedSinceMs;

    void updateReservoir(unsigned long nowMs);
    void updateTurbine(unsigned long nowMs);
};

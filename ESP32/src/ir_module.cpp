#include "ir_module.h"
#include <Arduino.h>

// ========================================================================
// Constructeur
// ========================================================================
IRModule::IRModule(uint8_t reservoirPin,
                   uint8_t turbinePin,
                   uint8_t reservoirEmptyLevel,
                   uint8_t turbineBlockedLevel,
                   unsigned long debounceMs)
    : _reservoirPin(reservoirPin),
      _turbinePin(turbinePin),
      _reservoirEmptyLevel(reservoirEmptyLevel),
      _turbineBlockedLevel(turbineBlockedLevel),
      _debounceMs(debounceMs),
      _reservoirEmpty(false),
      _turbineBlocked(false),
      _reservoirChanged(false),
      _turbineChanged(false),
      _lastReservoirRaw(0),
      _lastTurbineRaw(0),
      _lastReservoirRawChangeMs(0),
      _lastTurbineRawChangeMs(0),
      _turbineBlockedSinceMs(0)
{
}

// ========================================================================
// Initialisation des broches
// ========================================================================
void IRModule::begin()
{
    pinMode(_reservoirPin, INPUT);
    pinMode(_turbinePin, INPUT);

    // Lecture initiale
    _lastReservoirRaw = digitalRead(_reservoirPin);
    _lastTurbineRaw = digitalRead(_turbinePin);
    _lastReservoirRawChangeMs = millis();
    _lastTurbineRawChangeMs = millis();

    Serial.println("✅ IRModule initialisé");
}

// ========================================================================
// Mise à jour périodique (à appeler dans la loop)
// ========================================================================
void IRModule::update()
{
    unsigned long nowMs = millis();
    updateReservoir(nowMs);
    updateTurbine(nowMs);
}

// ========================================================================
// Mise à jour capteur réservoir (avec debounce)
// ========================================================================
void IRModule::updateReservoir(unsigned long nowMs)
{
    uint8_t currentRaw = digitalRead(_reservoirPin);

    // Détecte un changement brut
    if (currentRaw != _lastReservoirRaw)
    {
        _lastReservoirRaw = currentRaw;
        _lastReservoirRawChangeMs = nowMs;
    }

    // Après debounce, confirme le nouvel état
    if ((nowMs - _lastReservoirRawChangeMs) >= _debounceMs)
    {
        bool newState = (currentRaw == _reservoirEmptyLevel);
        if (newState != _reservoirEmpty)
        {
            _reservoirEmpty = newState;
            _reservoirChanged = true;
        }
    }
}

// ========================================================================
// Mise à jour capteur turbine (avec debounce + détection blocage)
// ========================================================================
void IRModule::updateTurbine(unsigned long nowMs)
{
    uint8_t currentRaw = digitalRead(_turbinePin);

    // Détecte un changement brut
    if (currentRaw != _lastTurbineRaw)
    {
        _lastTurbineRaw = currentRaw;
        _lastTurbineRawChangeMs = nowMs;
    }

    // Après debounce, confirme le nouvel état
    if ((nowMs - _lastTurbineRawChangeMs) >= _debounceMs)
    {
        bool newState = (currentRaw == _turbineBlockedLevel);
        if (newState != _turbineBlocked)
        {
            _turbineBlocked = newState;
            _turbineChanged = true;

            // Démarre le chronomètre de blocage si transition vers "bloqué"
            if (newState)
            {
                _turbineBlockedSinceMs = nowMs;
            }
            else
            {
                _turbineBlockedSinceMs = 0;
            }
        }
    }
}

// ========================================================================
// Accesseurs
// ========================================================================
bool IRModule::isReservoirEmpty() const
{
    return _reservoirEmpty;
}

bool IRModule::isTurbineBlocked() const
{
    return _turbineBlocked;
}

// ========================================================================
// Détection de changement d'état (utile pour événements)
// ========================================================================
bool IRModule::hasReservoirStateChanged()
{
    if (_reservoirChanged)
    {
        _reservoirChanged = false;
        return true;
    }
    return false;
}

bool IRModule::hasTurbineStateChanged()
{
    if (_turbineChanged)
    {
        _turbineChanged = false;
        return true;
    }
    return false;
}

// ========================================================================
// Détection blocage prolongé (ex: > 5 secondes = problème)
// ========================================================================
bool IRModule::isJamDetected(unsigned long jamThresholdMs) const
{
    if (!_turbineBlocked)
        return false;

    unsigned long blockedDuration = millis() - _turbineBlockedSinceMs;
    return blockedDuration >= jamThresholdMs;
}

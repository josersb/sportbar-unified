# Delta for registro-dispositivos

## ADDED Requirements

### Requirement: Destination Registration
The system SHALL register IPEX5002 decoder destinations alongside IPEX5001 source devices. A helper function MUST expose the full destination list to components.

#### Scenario: Destinations exposed to components
- GIVEN app initializes with 10 IPEX5002 destinations in estado.tvs
- WHEN a component needs destination metadata
- THEN it can query the destination list with labels and Arranger names

#### Scenario: Source and destination separation
- GIVEN both IPEX5001 sources (DTV1-DTV8) and IPEX5002 destinations are registered
- WHEN getByCapability('videoSource') is called
- THEN it returns only sources, not destinations

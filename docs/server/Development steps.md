# Mahjong Server Development Steps

This document outlines a step-by-step development plan for the Mahjong backend system, breaking down the process into logical phases from initial setup to final polishing.

## Phase 1: Project Setup and Basic Framework

1. **Initialize Spring Boot project**
   - Create project with necessary dependencies (WebSocket, Security, etc.)
   - Setup basic project structure following the guide
   - Configure application properties

2. **Set up JWT Authentication**
   - Implement JwtUtil class for token generation and validation
   - Create AuthService for user authentication
   - Implement in-memory UserRepository
   - Create AuthController with login endpoint

## Phase 2: Room Management System

3. **Room Model and Repository**
   - Implement Room model with required fields
   - Create RoomRepository for in-memory storage
   - Add room lifecycle states

4. **Room Service Implementation**
   - Implement room creation logic with random number/password generation
   - Develop room joining/listing functionality
   - Create RoomController with REST endpoints

5. **Room Cleanup Task**
   - Implement @Scheduled task for cleaning expired rooms
   - Add room expiration logic

## Phase 3: WebSocket Communication

6. **WebSocket Configuration**
   - Set up WebSocket endpoints
   - Implement connection authentication with JWT
   - Create session management

7. **Basic WebSocket Services**
   - Implement WebSocketService for message broadcasting
   - Create message handler for basic operations
   - Implement connection and disconnection handling

## Phase 4: Game Core Functionality

8. **Mahjong Tile Models**
   - Implement tile classes for all 136 tiles
   - Create deck shuffling and dealing functions

9. **Game State Management**
   - Implement Game model
   - Create game initialization logic
   - Add player management within games

10. **Basic Game Operations**
    - Implement core operations (draw, discard tiles)
    - Add tile manipulation functions
    - Create game state tracking

## Phase 5: Advanced Game Features

11. **Advanced Game Operations**
    - Implement taking tiles from the table
    - Add revealing tiles functionality
    - Create victory declaration and confirmation system

12. **Player Actions and History**
    - Add action tracking
    - Implement action history for UI display
    - Create action validation

## Phase 6: Connectivity and Robustness

13. **Reconnection Support**
    - Implement session-user mapping
    - Add state recovery after reconnection
    - Create session timeout handling

14. **Error Handling**
    - Implement comprehensive error handling
    - Add error message formatting
    - Create error notification system

## Phase 7: Testing and Optimization

15. **Unit Testing**
    - Write tests for core services
    - Test WebSocket message handling
    - Validate game logic

16. **Integration Testing**
    - Test room lifecycle management
    - Validate end-to-end game flow
    - Test reconnection scenarios

17. **Performance Optimization**
    - Optimize memory usage
    - Improve WebSocket message handling efficiency
    - Implement session management optimizations

## Phase 8: Final Polishing

18. **Documentation**
    - Create API documentation
    - Document WebSocket message formats
    - Add code documentation

19. **Deployment Preparation**
    - Configure for production environment
    - Set up logging
    - Create startup scripts

## Development Guidelines

- Follow incremental development approach, completing one phase before moving to the next
- Ensure proper testing at each phase before proceeding
- Maintain code quality and documentation throughout development
- Consider memory management carefully due to in-memory storage requirements
- Prioritize WebSocket performance and reliability for real-time gameplay 
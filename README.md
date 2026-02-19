# repLog

A modern workout tracking mobile application built with Angular and Capacitor. Track your workouts, muscle groups, exercises, and training logs all in one place.

## Features

- 📋 **Workout Management**: Create and organize your workout routines
- 💪 **Muscle Group Tracking**: Categorize exercises by muscle groups
- 🏋️ **Exercise Library**: Manage your exercise database
- 📊 **Training Logs**: Record sets, reps, and track your progress over time
- 📱 **Mobile-First**: Native Android support via Capacitor
- ⚡ **Modern Stack**: Built with Angular 21 and the latest web technologies

## Tech Stack

- **Framework**: Angular 21.1.0
- **Mobile Runtime**: Capacitor 8.1.0
- **Language**: TypeScript 5.9.2
- **Testing**: Vitest 4.0.8
- **Package Manager**: npm 11.8.0

## Architecture

- **Standalone Components**: Modern Angular architecture without NgModules
- **Signal-based State**: Leverages Angular signals for reactive state management
- **OnPush Change Detection**: Optimized performance
- **Lazy Loading**: Feature routes are lazily loaded
- **Service Layer**: Clean separation of concerns with dedicated services

## Prerequisites

- Node.js (LTS version recommended)
- npm 11.8.0 or higher
- Android Studio (for Android development)
- JDK 17 or higher (for Android builds)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd code

# Install dependencies
npm install
```

### Development Server

```bash
# Start the development server
npm start

# The app will be available at http://localhost:4200/
```

### Build

```bash
# Build for production
npm run build

# Build with watch mode for development
npm run watch
```

### Testing

```bash
# Run tests
npm test
```

## Mobile Development

### Android

```bash
# Build the web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then build and run from Android Studio.

## Project Structure

```
src/
├── app/
│   ├── components/       # UI components
│   │   ├── workout/      # Workout management
│   │   ├── muscle-group/ # Muscle group organization
│   │   ├── exercises/    # Exercise library
│   │   ├── log/          # Training log tracking
│   │   └── ...modals/    # Modal dialogs for CRUD operations
│   ├── models/           # Data models and types
│   ├── services/         # Business logic and data services
│   │   ├── workout-data.service.ts
│   │   ├── muscle-group.service.ts
│   │   ├── exercise.service.ts
│   │   ├── log.service.ts
│   │   ├── storage.service.ts
│   │   └── user-preferences.service.ts
│   ├── app.config.ts     # App configuration
│   └── app.routes.ts     # Route definitions
└── index.html
```

## Routes

- `/` - Workout list view
- `/muscle-group/:workoutId` - Muscle groups for a specific workout
- `/exercises/:muscleGroupId` - Exercises for a specific muscle group
- `/log/:exerciseId` - Training logs for a specific exercise

## Code Style

This project follows Angular and TypeScript best practices:

- Strict type checking enabled
- Standalone components (no NgModules)
- Signal-based state management
- OnPush change detection strategy
- Prettier for code formatting (100 char line width, single quotes)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and questions, please open an issue on the repository.

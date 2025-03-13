# Family Fun Plannings

A modern web application built with Angular 19 for planning and organizing family activities, managing group events, and tracking favorite activities.

## Features

- **Activity Management**

  - Browse and discover family-friendly activities
  - Save favorite activities
  - Detailed activity views with images and descriptions
  - Weather-based activity recommendations

- **Group Organization**

  - Create and manage family groups
  - Share activities with group members
  - Plan group events and activities
  - Track group participation

- **Calendar Integration**

  - View planned activities in monthly/daily views
  - Track upcoming events
  - Easy navigation between dates
  - Visual event indicators

- **Weather Integration**
  - Real-time weather updates
  - 5-day weather forecast
  - Weather-based activity suggestions
  - Multiple city support

## Technology Stack

- Angular 19
- TypeScript
- TailwindCSS v4
- RxJS
- Angular Router
- Angular Forms

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v19)

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd familyfunplannings
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
ng serve
```

4. Open your browser and navigate to `http://localhost:4200`

## Project Structure

```
src/
├── app/
│   ├── components/        # UI components
│   ├── services/         # Business logic and API calls
│   ├── models/          # TypeScript interfaces
│   ├── guards/          # Route guards
│   └── shared/          # Shared utilities and components
├── assets/             # Static files
└── environments/       # Environment configurations
```

## Key Components

- **Activity Component**: Browse and manage activities
- **Calendar Component**: View and manage scheduled events
- **Weather Component**: Weather integration and suggestions
- **Groups Component**: Manage family groups and shared activities

## Features in Detail

### Activity Management

- Browse activities with filtering options
- Save favorites for quick access
- Detailed activity views with rich media
- Share activities with groups

### Calendar Features

- Monthly and daily view options
- Visual event indicators
- Quick navigation
- Event details on click
- Multiple event types support

### Weather Integration

- Current weather display
- 5-day forecast
- Weather-based activity suggestions
- Multiple city support
- Dynamic weather icons

### Group Management

- Create and join groups
- Share activities with group members
- Plan group events
- Member management
- Activity scheduling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Weather data provided by OpenWeather API
- Icons from Heroicons
- UI components styled with TailwindCSS

## Support

For support, please open an issue in the repository or contact the development team.

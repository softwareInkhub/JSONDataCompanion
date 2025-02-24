# AI-Powered Data Transformation Platform

A comprehensive platform that generates and manages database schemas with intelligent parsing and real-time validation capabilities. This application provides powerful tools for data transformation, schema management, and database operations with an intuitive user interface.

## 🌟 Features

### Schema Management
- Create and manage database schemas with automatic validation
- AI-powered schema generation from sample data
- Version control for schemas
- Real-time schema validation
- Interactive schema editor with JSON support

### Data Transformation
- Support for multiple data formats:
  - JSON
  - XML
  - HTML
  - CSV
  - Excel
- AI-enhanced data transformation
- Real-time data validation against schemas
- Customizable filtering and sorting options

### Database Operations
- Interactive SQL query interface
- Table data visualization
- Real-time database management
- Schema-based data validation
- Performance optimized operations

## 🛠️ Tech Stack

- **Frontend**:
  - React with TypeScript
  - Shadcn UI components
  - Monaco Editor for code editing
  - Tailwind CSS for styling
  - TanStack Query for data fetching
  - Zod for schema validation

- **Backend**:
  - Express.js server
  - PostgreSQL database
  - Drizzle ORM
  - OpenAI integration
  - Multi-format parsers (XML, CSV, Excel)

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database
- OpenAI API key

### Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
OPENAI_API_KEY=your_openai_api_key
```

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd [project-directory]
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## 📖 Usage

### Managing Schemas

1. Navigate to the Schema Management section
2. Click "New Schema" to create a schema
3. Use the interactive editor to define your schema
4. Save and manage versions

### Data Transformation

1. Upload data in supported formats
2. Select or create a schema for validation
3. Apply transformations using AI assistance
4. Download or store the transformed data

### Database Operations

1. Access the Database View in Schema Management
2. Execute SQL queries
3. View and manage table data
4. Monitor database performance

## 🔌 API Reference

### Schemas

```typescript
POST /api/schemas
GET /api/schemas
PUT /api/schemas/:id
DELETE /api/schemas/:id
```

### Data Transformation

```typescript
POST /api/generate
POST /api/upload
GET /api/:id
```

### Database Operations

```typescript
POST /api/execute-sql
GET /api/table-data/:table
```

## 📚 Database Schema

### Schemas Table
```sql
CREATE TABLE schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Endpoints Table
```sql
CREATE TABLE endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  json_data JSONB NOT NULL,
  schema_id UUID REFERENCES schemas(id),
  filter_options JSONB,
  sort_options JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Development

### Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/           # UI components
│   │   ├── pages/           # Application pages
│   │   └── hooks/           # Custom React hooks
├── server/
│   ├── routes.ts           # API routes
│   ├── db.ts              # Database configuration
│   └── storage.ts         # Storage interface
└── shared/
    └── schema.ts          # Shared types and schemas
```

### Adding New Features

1. **Schema Management**:
   - Add new schema types in `shared/schema.ts`
   - Implement validation in `server/routes.ts`
   - Update UI components in `client/src/components/ui/`

2. **Database Operations**:
   - Add new queries in `server/routes.ts`
   - Update storage interface in `server/storage.ts`
   - Implement UI changes in `client/src/components/ui/database-view.tsx`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for AI capabilities
- [Shadcn UI](https://ui.shadcn.com) for beautiful components
- [Drizzle ORM](https://orm.drizzle.team) for database operations
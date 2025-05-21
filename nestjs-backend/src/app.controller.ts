import { Controller, Get, Redirect, UseGuards, Headers, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/status')
  getStatus() {
    return {
      status: 'OK',
      message: 'API is running',
      time: new Date().toISOString(),
    };
  }

  @Get('api/status')
  getApiStatus() {
    return {
      status: 'OK',
      message: 'API is running',
      time: new Date().toISOString(),
    };
  }

  @Get('/instructors')
  @UseGuards(JwtAuthGuard)
  async getInstructors() {
    console.log("Fetching instructors...");
    try {
      // Use EXACTLY the same query as Express
      const instructorsResult = await this.dataSource.query(`
        SELECT id, first_name, last_name, email 
        FROM users 
        WHERE role = 'instructor'
        ORDER BY first_name, last_name
      `);
      
      const instructors = instructorsResult || [];
      console.log(`Found ${instructors.length} instructors`);
      
      // Debug output
      if (instructors.length > 0) {
        console.log("Sample instructor data:", JSON.stringify(instructors[0]));
      }
      
      // EXACTLY match Express formatting with null handling
      const formattedInstructors = instructors.map(instructor => {
        // Handle null values by checking if they exist
        let name = 'Unknown';
        if (instructor.first_name && instructor.last_name) {
          // Ensure a space (not a dot) between first and last name
          name = instructor.first_name + ' ' + instructor.last_name;
        } else if (instructor.email) {
          // For email usernames, replace dots with spaces
          const username = instructor.email.split('@')[0];
          name = username.replace(/\./g, ' ');
        }
        
        return {
          id: instructor.id,
          name: name,
          email: instructor.email
        };
      });
      
      // Debug: log the first instructor's formatted name
      if (formattedInstructors.length > 0) {
        console.log("First instructor formatted name:", formattedInstructors[0].name);
      }
      
      return formattedInstructors;
    } catch (error) {
      console.error('Error fetching instructors:', error);
      return [];
    }
  }

  @Get('/departments')
  @UseGuards(JwtAuthGuard)
  async getDepartments() {
    console.log("Fetching departments...");
    try {
      // Get raw database results with EXACTLY the same query from Express
      const departmentsResult = await this.dataSource.query(`
        SELECT id, name, description 
        FROM departments 
        ORDER BY name
      `);
      
      // Manually convert to array of plain objects with expected property names
      const departments = departmentsResult.map(dept => {
        // Use description as name if name is empty
        const displayName = dept.name && dept.name.trim() !== '' ? 
                            dept.name : 
                            (dept.description ? dept.description.substring(0, 20) + '...' : 'Department ' + dept.id);
        
        return {
          id: dept.id,
          name: displayName,
          description: dept.description
        };
      }) || [];
      
      console.log(`Found ${departments.length} departments`);
      console.log("Department data sample:", departments.length > 0 ? JSON.stringify(departments[0]) : "No departments");
      
      return departments;
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }
}

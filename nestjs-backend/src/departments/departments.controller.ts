import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { DepartmentResponseDto } from './dto/department-response.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createDepartmentDto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    const department = await this.departmentsService.create(createDepartmentDto);
    return this.departmentsService.toDepartmentResponseDto(department);
  }

  @Get()
  async findAll() {
    // Return raw department entities to match Express backend format
    return this.departmentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DepartmentResponseDto> {
    const department = await this.departmentsService.findOne(+id);
    return this.departmentsService.toDepartmentResponseDto(department);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    const department = await this.departmentsService.update(+id, updateDepartmentDto);
    return this.departmentsService.toDepartmentResponseDto(department);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.departmentsService.remove(+id);
    return { message: 'Department deleted successfully' };
  }
} 
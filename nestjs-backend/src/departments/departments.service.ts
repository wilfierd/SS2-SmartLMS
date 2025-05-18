import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private dataSource: DataSource
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentsRepository.create(createDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async findAll(): Promise<any[]> {
    const departments = await this.departmentsRepository.find({ order: { name: 'ASC' } });
    
    // Transform to match Express backend format exactly
    return departments.map(department => ({
      id: department.id,
      name: department.name,
      description: department.description
      // No timestamps, matching Express backend format
    }));
  }

  // Get raw departments with exact same format as Express
  async getRawDepartments(): Promise<any[]> {
    // Use direct query exactly like Express backend
    const [departments] = await this.dataSource.query(`
      SELECT id, name, description 
      FROM departments 
      ORDER BY name
    `);
    
    return departments;
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id } });
    
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    
    return department;
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    
    // Update department properties
    Object.assign(department, updateDepartmentDto);
    
    return this.departmentsRepository.save(department);
  }

  async remove(id: number): Promise<void> {
    const result = await this.departmentsRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
  }
  
  async toDepartmentResponseDto(department: Department): Promise<DepartmentResponseDto> {
    return {
      id: department.id,
      name: department.name,
      description: department.description,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }
} 
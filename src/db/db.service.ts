import { Injectable } from '@nestjs/common';
import { Employee, Document, ComplianceForm, Milestone } from '../interfaces/types.interface';

@Injectable()
export class DbService {
  employees: Employee[] = [];
  documents: Document[] = [];
  complianceForms: ComplianceForm[] = [];
  milestones: Milestone[] = [];

  clear() {
    this.employees = [];
    this.documents = [];
    this.complianceForms = [];
    this.milestones = [];
  }
}

import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractTypeormEntity } from '../contract.typeorm-entity';

export class ContractMapper {
  static toDomain(raw: ContractTypeormEntity): ContractEntity {
    return ContractEntity.reconstitute({
      id: raw.id,
      landlordId: raw.landlordId,
      roomId: raw.roomId,
      tenantId: raw.tenantId,
      tenantName: raw.tenantName,
      tenantPhone: raw.tenantPhone,
      status: raw.status,
      depositAmount: raw.depositAmount,
      rentPrice: raw.rentPrice,
      startDate: raw.startDate,
      endDate: raw.endDate,
      vehicleCount: raw.vehicleCount,
      description: raw.description,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(contract: ContractEntity): ContractTypeormEntity {
    const raw = new ContractTypeormEntity();
    raw.id = contract.id;
    raw.landlordId = contract.landlordId;
    raw.roomId = contract.roomId;
    raw.tenantId = contract.tenantId;
    raw.tenantName = contract.tenantName;
    raw.tenantPhone = contract.tenantPhone;
    raw.status = contract.status;
    raw.depositAmount = contract.depositAmount;
    raw.rentPrice = contract.rentPrice;
    raw.startDate = contract.startDate;
    raw.endDate = contract.endDate;
    raw.vehicleCount = contract.vehicleCount;
    raw.description = contract.description;
    raw.createdAt = contract.createdAt;
    raw.updatedAt = contract.updatedAt;
    raw.isDeleted = contract.isDeleted;
    return raw;
  }
}

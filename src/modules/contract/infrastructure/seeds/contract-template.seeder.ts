import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { ContractTemplateTypeormEntity } from '../persistence/contract-template.entity';

export class ContractTemplateSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    await dataSource.getRepository(ContractTemplateTypeormEntity).upsert(
      {
        templateKey: 'standard-room-lease-v1',
        title: 'Hợp đồng thuê phòng trọ',
        version: '1.0',
        body: `
<h1>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h1>
<p>Bản nháp để kiểm tra thông tin, in ra và ký tay giữa hai bên.</p>
<h2>1. Các bên tham gia</h2>
<p>Bên cho thuê: {{landlordName}}</p>
<p>Bên thuê: {{tenantName}}</p>
<p>Số điện thoại người thuê: {{tenantPhone}}</p>
<p>Số CCCD/CMND đối chiếu khi ký: ........................................</p>
<h2>2. Phòng và thời hạn thuê</h2>
<p>Phòng: {{roomName}}</p>
<p>Địa chỉ: {{buildingAddress}}</p>
<p>Thời hạn thuê từ ngày {{startDate}} đến ngày {{endDate}}.</p>
<h2>3. Tiền thuê và đặt cọc</h2>
<p>Giá thuê: {{rentPrice}} VNĐ/tháng.</p>
<p>Tiền đặt cọc: {{depositAmount}} VNĐ.</p>
<p>Ngày thanh toán thỏa thuận: ngày {{paymentDueDay}} hằng tháng.</p>
<h2>4. Xác nhận</h2>
<p>Hai bên kiểm tra thông tin, thỏa thuận các điều khoản bổ sung trên giấy và ký tay.</p>
<p>BÊN CHO THUÊ (ký, ghi rõ họ tên)</p>
<p>........................................................................</p>
<p>BÊN THUÊ (ký, ghi rõ họ tên)</p>
<p>........................................................................</p>`,
        requiredVariables: [
          'tenantName',
          'tenantPhone',
          'roomName',
          'buildingAddress',
          'rentPrice',
          'depositAmount',
          'startDate',
          'endDate',
          'paymentDueDay',
        ],
        isActive: true,
        isDeleted: false,
      },
      { conflictPaths: ['templateKey'], skipUpdateIfNoValuesChanged: true },
    );
  }
}

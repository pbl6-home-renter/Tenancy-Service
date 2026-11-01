import { ContractTemplateEntity } from '../../domain/entities/contract-template.entity';

export type ContractDocumentVariables = Record<
  string,
  string | number | null | undefined
>;

export interface ContractDocumentRendererPort {
  render(
    template: ContractTemplateEntity,
    variables: ContractDocumentVariables,
  ): Promise<Buffer>;
}

import { BaseEntity } from 'shared/domain/base/base.entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TemplateDataInvalidException } from '../exceptions/template-data-invalid.exception';
import { ContractTemplateProps } from './contract-template.props';

export class ContractTemplateEntity extends BaseEntity {
  private constructor(
    id: Uuid,
    readonly templateKey: string,
    readonly title: string,
    readonly version: string,
    readonly body: string,
    readonly requiredVariables: readonly string[],
    readonly isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static reconstitute(props: ContractTemplateProps): ContractTemplateEntity {
    return new ContractTemplateEntity(
      props.id,
      props.templateKey,
      props.title,
      props.version,
      props.body,
      [...props.requiredVariables],
      props.isActive,
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  assertVariables(
    variables: Readonly<Record<string, string | number | null | undefined>>,
  ): void {
    const missing = this.requiredVariables.filter((name) => {
      const value = Object.hasOwn(variables, name)
        ? variables[name]
        : undefined;
      if (typeof value === 'string') return !value.trim();
      if (typeof value === 'number') return !Number.isFinite(value);
      return true;
    });
    if (missing.length > 0) {
      throw new TemplateDataInvalidException(
        `Missing or invalid template variables: ${missing.join(', ')}`,
      );
    }
  }
}

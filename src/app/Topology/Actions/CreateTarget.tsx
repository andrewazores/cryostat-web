/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import openjdkSvg from '@app/assets/openjdk.svg';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { LinearDotSpinner } from '@app/Shared/Components/LinearDotSpinner';
import { LoadingProps } from '@app/Shared/Components/types';
import { Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import '@app/Topology/styles/base.css';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getAnnotation, portalRoot, toPath } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  ActionGroup,
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  Flex,
  FlexItem,
  Form,
  FormAlert,
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  gridSpans,
  HelperText,
  HelperTextItem,
  TextInput,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, PendingIcon, SyncAltIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

export const isValidTargetConnectURL = (connectUrl?: string) => connectUrl && !connectUrl.match(/\s+/);

export interface CreateTargetProps {
  prefilled?: {
    connectUrl: string;
    alias?: string;
    username?: string;
    password?: string;
  };
}

export const CreateTarget: React.FC<CreateTargetProps> = ({ prefilled }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const navigate = useNavigate();
  const { t } = useCryostatTranslation();

  const [example, setExample] = React.useState('');
  const [{ connectUrl, alias, validConnectUrl, username, password }, setFormData] = React.useState({
    connectUrl: '',
    alias: '',
    validConnectUrl: ValidatedOptions.default,
    username: '',
    password: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [validation, setValidation] = React.useState({
    option: ValidatedOptions.default,
    errorMessage: '',
  });
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]); // Array of ids

  const target = React.useMemo(() => ({ connectUrl, alias }), [connectUrl, alias]);

  const credentials = React.useMemo(() => ({ username, password }), [username, password]);

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'creating-custom-target',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  const toggleCredentialForm = React.useCallback(
    (toggleId: string) =>
      setExpandedSections((old) => {
        const matched = old.find((id) => id === toggleId);
        if (matched) {
          return old.filter((id) => id !== matched);
        } else {
          return [...old, toggleId];
        }
      }),
    [setExpandedSections],
  );

  const resetTestState = React.useCallback(
    () => setValidation({ option: ValidatedOptions.default, errorMessage: '' }),
    [setValidation],
  );

  const handleConnectUrlChange = React.useCallback(
    (_, connectUrl: string) => {
      setFormData((old) => ({
        ...old,
        connectUrl,
        validConnectUrl:
          connectUrl === ''
            ? ValidatedOptions.default
            : isValidTargetConnectURL(connectUrl)
              ? ValidatedOptions.success
              : ValidatedOptions.error,
      }));
      resetTestState();
    },
    [setFormData, resetTestState],
  );

  const handleAliasChange = React.useCallback(
    (_, alias: string) => {
      setFormData((old) => ({ ...old, alias }));
      resetTestState();
    },
    [setFormData, resetTestState],
  );

  const handleUsernameChange = React.useCallback(
    (_, username: string) => {
      setFormData((old) => ({ ...old, username }));
      resetTestState();
    },
    [setFormData, resetTestState],
  );

  const handlePasswordChange = React.useCallback(
    (_, password: string) => {
      setFormData((old) => ({ ...old, password }));
      resetTestState();
    },
    [setFormData, resetTestState],
  );

  const exitForm = React.useCallback(() => navigate('..', { relative: 'path' }), [navigate]);

  const handleSubmit = React.useCallback(() => {
    setLoading(true);
    // Get storage location
    addSubscription(
      context.api
        .createTarget(
          {
            connectUrl: connectUrl,
            alias: alias.trim() || connectUrl,
          },
          credentials,
          true,
        )
        .subscribe((success) => {
          setLoading(false);
          const option = success ? ValidatedOptions.success : ValidatedOptions.error;
          if (option === ValidatedOptions.success) {
            exitForm();
          } else {
            let errorMessage = 'Connection test failure';
            setValidation({
              option: option,
              errorMessage,
            });
          }
        }),
    );
  }, [setLoading, setValidation, addSubscription, context.api, connectUrl, alias, exitForm, credentials]);

  const testTarget = React.useCallback(() => {
    if (!isValidTargetConnectURL(connectUrl)) {
      return;
    }
    addSubscription(
      context.api
        .createTarget(
          {
            connectUrl: connectUrl,
            alias: alias.trim() || connectUrl,
          },
          credentials,
          false,
          true,
        )
        .subscribe((success) => {
          setTesting(false);
          const option = success ? ValidatedOptions.success : ValidatedOptions.error;
          setValidation({
            option: option,
            errorMessage: option !== ValidatedOptions.success ? '' : 'Connection test failure',
          });
        }),
    );
    setTesting(true);
    resetTestState();
  }, [connectUrl, alias, credentials, addSubscription, context.api, resetTestState, setTesting]);

  React.useEffect(() => {
    if (prefilled) {
      const { connectUrl, alias, username, password } = prefilled;
      setFormData({
        connectUrl: connectUrl,
        alias: alias || '',
        validConnectUrl: isValidTargetConnectURL(connectUrl) ? ValidatedOptions.success : ValidatedOptions.error,
        username: username || '',
        password: password || '',
      });
    }
  }, [prefilled]);

  React.useEffect(() => {
    addSubscription(
      context.targets.targets().subscribe((ts) => {
        const discoveredTargets = ts.filter((t) => getAnnotation(t.annotations.cryostat, 'REALM') !== 'Custom Targets');
        if (discoveredTargets.length) {
          setExample(discoveredTargets[0].connectUrl);
        }
      }),
    );
  }, [addSubscription, context.targets, setExample]);

  const responsiveSpans = React.useMemo(
    () => [
      {
        xl2: 7 as gridSpans,
        xl: 7 as gridSpans,
        lg: 7 as gridSpans,
        md: 12 as gridSpans,
        sm: 12 as gridSpans,
      } as Record<'xl2' | 'xl' | 'lg' | 'md' | 'sm', gridSpans>,
      {
        xl2: 5 as gridSpans,
        xl: 5 as gridSpans,
        lg: 5 as gridSpans,
        md: 12 as gridSpans,
        sm: 12 as gridSpans,
      } as Record<'xl2' | 'xl' | 'lg' | 'md' | 'sm', gridSpans>,
    ],
    [],
  );

  const connectUrlHelperText = React.useMemo(() => {
    if (validConnectUrl === ValidatedOptions.error) {
      return 'JMX Service URL must not contain empty spaces.';
    }
    return (
      <>
        JMX Service URL.{' '}
        {example && (
          <>
            For example,
            <ClipboardCopy hoverTip="Click to copy to clipboard" clickTip="Copied!" variant="inline-compact">
              {example}
            </ClipboardCopy>
          </>
        )}
      </>
    );
  }, [validConnectUrl, example]);

  return (
    <BreadcrumbPage pageTitle={'Create Custom Target'} breadcrumbs={[{ title: 'Topology', path: toPath('/topology') }]}>
      <Card isFullHeight>
        <CardTitle>Create Custom Target</CardTitle>
        <CardBody>
          <Form className="console-form-group">
            <Grid hasGutter>
              <GridItem {...responsiveSpans[0]} order={{ default: '0', lg: '0', xl: '0' }}>
                <FormAlert>
                  <Alert
                    variant="info"
                    title={
                      'Note: If the target requires authentication, use JMX Credential options to provide credentials.'
                    }
                    aria-live="polite"
                    isInline
                  />
                </FormAlert>
                <FormGroup label="Connection URL" isRequired fieldId="connect-url">
                  <TextInput
                    aria-label={'Connection URL'}
                    value={connectUrl}
                    isRequired
                    type="text"
                    id="connect-url"
                    placeholder={example}
                    onChange={handleConnectUrlChange}
                    isDisabled={loading || testing}
                    validated={validConnectUrl}
                    data-quickstart-id="ct-connecturl-input"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant={validConnectUrl}>{connectUrlHelperText}</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
                <FormGroup label="Alias" fieldId="alias">
                  <TextInput
                    value={alias}
                    type="text"
                    id="alias"
                    onChange={handleAliasChange}
                    isDisabled={loading || testing}
                    data-quickstart-id="ct-alias-input"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>Connection nickname (same as Connection URL if not specified).</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
                <FormGroup>
                  <Accordion asDefinitionList={false} data-quickstart-id="ct-credential-expand">
                    <AccordionItem>
                      <AccordionToggle
                        className="expandable-form__accordion-toggle-block"
                        id={'jmx-credential-option'}
                        isExpanded={expandedSections.includes('jmx-credential-option')}
                        onClick={() => toggleCredentialForm('jmx-credential-option')}
                        type={'button'}
                      >
                        <span className="expandable-form__title">JMX Credential options</span>
                      </AccordionToggle>
                      <div className="expandable-form__help-block " id={'jmx-credential-option-description'}>
                        Creates credentials that Cryostat uses to connect to target JVMs over JMX.
                      </div>
                      <AccordionContent
                        isHidden={!expandedSections.includes('jmx-credential-option')}
                        id={'expanded-jmx-credential-option'}
                      >
                        <FormGroup label={'Username'} fieldId="username" className="expandable-form__form-group">
                          <TextInput
                            aria-label={'Username'}
                            value={username}
                            isRequired
                            type="text"
                            id="username"
                            onChange={handleUsernameChange}
                            isDisabled={loading || testing}
                            data-quickstart-id="ct-username-input"
                          />
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem>Username for JMX connection.</HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        </FormGroup>
                        <FormGroup label={'Password'} fieldId="password" className="expandable-form__form-group">
                          <TextInput
                            value={password}
                            isDisabled={loading || testing}
                            isRequired
                            type="password"
                            id="password"
                            onChange={handlePasswordChange}
                            data-quickstart-id="ct-password-input"
                          />
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem>Password for JMX connection.</HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        </FormGroup>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </FormGroup>
              </GridItem>
              <GridItem {...responsiveSpans[1]} order={{ default: '1', lg: '1', xl: '1', md: '1' }}>
                <SampleNodeDonut
                  target={{ ...target, labels: [], annotations: { cryostat: [], platform: [] } }}
                  validation={validation}
                  testing={testing}
                  onClick={testTarget}
                />
              </GridItem>
            </Grid>
            <ActionGroup>
              <Button
                variant="primary"
                isDisabled={validation.option !== ValidatedOptions.success}
                onClick={handleSubmit}
                {...createButtonLoadingProps}
                data-quickstart-id="ct-create-btn"
              >
                {loading ? t('CREATING') : t('CREATE')}
              </Button>
              <Button variant="secondary" onClick={exitForm}>
                {t('CANCEL')}
              </Button>
            </ActionGroup>
          </Form>
        </CardBody>
      </Card>
      <></>
    </BreadcrumbPage>
  );
};

export interface SampleNodeDonutProps {
  target: Omit<Target, 'agent'>;
  testing?: boolean;
  validation: {
    option: ValidatedOptions;
    errorMessage: string;
  };
  onClick?: () => void;
  className?: string;
}

export const SampleNodeDonut: React.FC<SampleNodeDonutProps> = ({
  target,
  className,
  testing,
  validation,
  onClick,
}) => {
  const _transformedTarget = React.useMemo(
    () => ({ connectUrl: target.connectUrl, alias: target.alias.trim() || target.connectUrl }),
    [target],
  );

  const _actionEnabled = React.useMemo(() => isValidTargetConnectURL(target.connectUrl), [target]);

  const statusIcon = React.useMemo(() => {
    if (testing) {
      return { icon: <SyncAltIcon />, message: 'Testing Custom Target definition.' };
    }
    return validation.option === ValidatedOptions.success
      ? {
          icon: <CheckCircleIcon color="var(--pf-v5-global--success-color--100)" />,
          message: 'Target definition is valid.',
        }
      : validation.option === ValidatedOptions.error
        ? {
            icon: <ExclamationCircleIcon color="var(--pf-v5-global--danger-color--100)" />,
            message: validation.errorMessage,
          }
        : { icon: <PendingIcon />, message: '' };
  }, [validation, testing]);

  return (
    <>
      {validation.option === ValidatedOptions.error && (
        <FormAlert>
          <Alert aria-live="polite" isInline title={validation.errorMessage} variant="danger">
            {'Check if the connection URL is valid. Specify the correct credentials in case of authentication failure.'}
          </Alert>
        </FormAlert>
      )}
      <Flex className={css(className)} direction={{ default: 'column' }}>
        <Flex
          alignSelf={{ default: 'alignSelfCenter' }}
          direction={{ default: 'column' }}
          data-quickstart-id="ct-sample-testnode"
        >
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <Tooltip
              appendTo={portalRoot}
              content={
                _actionEnabled
                  ? `Click to test${validation.option !== ValidatedOptions.default ? ' again' : ''}.`
                  : 'Please provide a valid Connection URL.'
              }
            >
              <div
                className={css('sample-node-donut__node-wrapper', `${_actionEnabled ? 'active' : ''}`)}
                onClick={_actionEnabled ? onClick : undefined}
                data-quickstart-id="ct-sample-testnode-icon"
              >
                <div
                  className={css(
                    'sample-node-donut__node-icon',
                    validation.option !== ValidatedOptions.default ? validation.option : '',
                  )}
                >
                  <Bullseye>{testing ? <LinearDotSpinner /> : <img src={openjdkSvg} alt="Cryostat Logo" />}</Bullseye>
                </div>
                <div className={'sample-node-donut__status-indicator'}>{statusIcon.icon}</div>
              </div>
            </Tooltip>
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <div className={css('sample-node-donut__node-label')}>
              <Tooltip content={'Custom Target'} appendTo={portalRoot}>
                <span className="sample-node-donut__node-label-badge">{'CT'}</span>
              </Tooltip>
              {_transformedTarget.alias || '<Name>'}
            </div>
          </FlexItem>
        </Flex>
        <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
          <HelperText>
            <HelperTextItem>Click on the sample node above to test Custom Target definition.</HelperTextItem>
          </HelperText>
        </FlexItem>
      </Flex>
    </>
  );
};

export default CreateTarget;

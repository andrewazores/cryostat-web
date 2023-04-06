/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ServiceContext } from '@app/Shared/Services/Services';
import { FormGroup, HelperText, HelperTextItem, NumberInput, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingTab, UserSetting } from './SettingsUtils';

const min = 1;

const Component = () => {
  const [t] = useTranslation();
  const context = React.useContext(ServiceContext);

  const [minRefresh, setMinRefresh] = React.useState(context.settings.chartControllerConfig().minRefresh);

  const handleChange = React.useCallback(
    (evt) => {
      setMinRefresh((prev) => {
        let value = isNaN(evt.target.value) ? prev : Number(evt.target.value);
        if (value < min) {
          value = min;
        }
        context.settings.setChartControllerConfig({ minRefresh: value });
        return value;
      });
    },
    [setMinRefresh, context.settings]
  );

  const handleVisibleStep = React.useCallback(
    (delta: number) => () => {
      const v = minRefresh + delta;
      context.settings.setChartControllerConfig({ minRefresh: v });
      setMinRefresh(v);
    },
    [minRefresh, context.settings]
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup>
          <HelperText>
            <HelperTextItem>{t('SETTINGS.CHARTS_CONFIG.REFRESH_RATE_SETTING')}</HelperTextItem>
          </HelperText>
          <NumberInput
            inputName="minRefresh"
            value={minRefresh}
            min={min}
            onChange={handleChange}
            onMinus={handleVisibleStep(-1)}
            onPlus={handleVisibleStep(1)}
            unit={t('SECOND', { ns: 'common' })}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export const ChartCardsConfig: UserSetting = {
  titleKey: 'SETTINGS.CHARTS_CONFIG.TITLE',
  descConstruct: 'SETTINGS.CHARTS_CONFIG.DESCRIPTION',
  content: Component,
  category: SettingTab.DASHBOARD,
};
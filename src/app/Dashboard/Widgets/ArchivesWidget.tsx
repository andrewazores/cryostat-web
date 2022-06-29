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
import * as React from 'react';
import {map} from 'rxjs';
import {ServiceContext} from '@app/Shared/Services/Services';
import {Target} from '@app/Shared/Services/Target.service';
import {useSubscriptions} from '@app/utils/useSubscriptions';
import {CardBody, CardTitle, Stack, StackItem, Text, TextVariants} from '@patternfly/react-core';
import {DashboardWidget} from './DashboardWidget';
import {NotificationCategory} from '@app/Shared/Services/NotificationChannel.service';

export interface ArchivesWidgetProps {
  target: Target | undefined;
}

export const ArchivesWidget = (props: ArchivesWidgetProps) => {

  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [count, setCount] = React.useState(0);
  const [size, setSize] = React.useState(0);

  React.useEffect(() => {
    if (!props.target) {
      return;
    }
    addSubscription(
      context.api.graphql<any>(`
            query {
              targetNodes(filter: { name: "${props?.target?.connectUrl}" }) {
                recordings {
                  archived {
                    name
                    downloadUrl
                    reportUrl
                    metadata {
                      labels
                    }
                  }
                }
              }
            }`
      ).pipe(
        map(v => v.data.targetNodes[0].recordings.archived as any[]),
        map(arr => arr.length)
      )
      .subscribe(setCount)
    );
  }, [props, props.target, context, context.api, setCount]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ActiveRecordingSaved)
      .subscribe(() => setCount(old => old + 1))
    );
  }, [addSubscription, context, context.notificationChannel, setCount]);
  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted)
      .subscribe(() => setCount(old => old - 1))
    );
  }, [addSubscription, context, context.notificationChannel, setCount]);

  React.useEffect(() => {
    setSize(count * 50);
  }, [count, setSize]);

  return (<>
    <DashboardWidget>
      <CardTitle>Archives</CardTitle>
      <CardBody>
        <Stack>
          <StackItem>
            <Text component={TextVariants.p}>Latest: {new Date().toISOString()}</Text>
          </StackItem>
          <StackItem>
            <Text component={TextVariants.p}>Count: {count}</Text>
          </StackItem>
          <StackItem>
            <Text component={TextVariants.p}>Total size: {size}MiB</Text>
          </StackItem>
        </Stack>
      </CardBody>
    </DashboardWidget>
  </>);

};
